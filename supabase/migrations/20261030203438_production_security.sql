-- Apply only to a reviewed staging clone first. This migration is transactional.
BEGIN;
DO $$
DECLARE name text; required_column text;
BEGIN
  FOREACH name IN ARRAY ARRAY['users','products','cart_items','orders','product_reviews','contact_messages','newsletter_subscriptions'] LOOP
    IF to_regclass('public.' || name) IS NULL THEN RAISE EXCEPTION 'Required application table is missing: %', name; END IF;
  END LOOP;
  FOREACH required_column IN ARRAY ARRAY['id','user_id','payment_id','payment_status','order_status','total_amount','product_list'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND columns.column_name=required_column) THEN
      RAISE EXCEPTION 'Required order column is missing: %', required_column;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='product-image') THEN RAISE EXCEPTION 'Product image bucket must be provisioned first'; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE OR REPLACE FUNCTION private.is_store_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id=auth.uid() AND role='admin');
$$;
REVOKE ALL ON FUNCTION private.is_store_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_store_admin() TO authenticated, service_role;

-- A trusted auth trigger owns profile creation. User-editable metadata supplies display text only.
CREATE OR REPLACE FUNCTION private.sync_store_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users (id,email,name,role)
  VALUES (NEW.id, coalesce(NEW.email,'guest_' || NEW.id::text || '@guest.invalid'), CASE WHEN coalesce(NEW.is_anonymous,false) THEN 'Guest' ELSE left(coalesce(NEW.raw_user_meta_data->>'name','Customer'),200) END, 'user')
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_store_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_store_profile ON auth.users;
CREATE TRIGGER sync_store_profile AFTER INSERT OR UPDATE OF email,is_anonymous,raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.sync_store_profile();

-- Replace existing application-table policies: permissive policies combine with OR.
DO $$ DECLARE table_name text; policy record; column_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','products','cart_items','orders','product_reviews','contact_messages','newsletter_subscriptions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,table_name);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',table_name);
    FOR column_name IN SELECT a.attname FROM pg_attribute AS a WHERE a.attrelid=to_regclass('public.' || table_name) AND a.attnum>0 AND NOT a.attisdropped LOOP
      EXECUTE format('REVOKE ALL (%I) ON public.%I FROM PUBLIC, anon, authenticated',column_name,table_name);
    END LOOP;
    EXECUTE format('GRANT ALL ON public.%I TO service_role',table_name);
  END LOOP;
END $$;

GRANT SELECT ON public.users TO authenticated;
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated USING (id=auth.uid() OR (SELECT private.is_store_admin()));
-- No browser INSERT/UPDATE privilege on profiles, including the role column.

GRANT SELECT ON public.products TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.products TO authenticated;
CREATE POLICY catalog_read ON public.products FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY catalog_create ON public.products FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_store_admin()));
CREATE POLICY catalog_update ON public.products FOR UPDATE TO authenticated USING ((SELECT private.is_store_admin())) WITH CHECK ((SELECT private.is_store_admin()));
CREATE POLICY catalog_delete ON public.products FOR DELETE TO authenticated USING ((SELECT private.is_store_admin()));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.cart_items TO authenticated;
CREATE POLICY cart_read ON public.cart_items FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY cart_create ON public.cart_items FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND quantity BETWEEN 1 AND 100);
CREATE POLICY cart_update ON public.cart_items FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND quantity BETWEEN 1 AND 100);
CREATE POLICY cart_delete ON public.cart_items FOR DELETE TO authenticated USING (user_id=auth.uid());

GRANT SELECT,DELETE ON public.orders TO authenticated;
GRANT UPDATE (order_status) ON public.orders TO authenticated;
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated USING (user_id=auth.uid() OR (SELECT private.is_store_admin()));
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING ((SELECT private.is_store_admin())) WITH CHECK ((SELECT private.is_store_admin()));
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING ((SELECT private.is_store_admin()));
-- Only trusted server code may create orders or set prices/payment status.
CREATE UNIQUE INDEX IF NOT EXISTS store_cart_owner_product_unique ON public.cart_items(user_id,product_id);
CREATE UNIQUE INDEX IF NOT EXISTS store_orders_payment_id_unique ON public.orders(payment_id);

GRANT SELECT ON public.product_reviews TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.product_reviews TO authenticated;
CREATE POLICY reviews_read ON public.product_reviews FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY reviews_create ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND rating BETWEEN 1 AND 5 AND length(review_text) BETWEEN 1 AND 4000);
CREATE POLICY reviews_update ON public.product_reviews FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND rating BETWEEN 1 AND 5 AND length(review_text) BETWEEN 1 AND 4000);
CREATE POLICY reviews_delete ON public.product_reviews FOR DELETE TO authenticated USING (user_id=auth.uid() OR (SELECT private.is_store_admin()));

GRANT INSERT ON public.contact_messages,public.newsletter_subscriptions TO anon,authenticated;
GRANT SELECT,DELETE ON public.contact_messages,public.newsletter_subscriptions TO authenticated;
CREATE POLICY contact_create ON public.contact_messages FOR INSERT TO anon,authenticated WITH CHECK (length(name) BETWEEN 1 AND 200 AND length(email) BETWEEN 3 AND 320 AND length(message) BETWEEN 1 AND 5000 AND coalesce(length(phone),0)<=30);
CREATE POLICY contact_read ON public.contact_messages FOR SELECT TO authenticated USING ((SELECT private.is_store_admin()));
CREATE POLICY contact_delete ON public.contact_messages FOR DELETE TO authenticated USING ((SELECT private.is_store_admin()));
CREATE POLICY newsletter_create ON public.newsletter_subscriptions FOR INSERT TO anon,authenticated WITH CHECK (length(email) BETWEEN 3 AND 320);
CREATE POLICY newsletter_read ON public.newsletter_subscriptions FOR SELECT TO authenticated USING ((SELECT private.is_store_admin()));
CREATE POLICY newsletter_delete ON public.newsletter_subscriptions FOR DELETE TO authenticated USING ((SELECT private.is_store_admin()));

-- Existing serial/identity-backed IDs still need sequence access for permitted inserts.
DO $$ DECLARE item record; sequence_name text;
BEGIN
  FOR item IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('products','cart_items','product_reviews','contact_messages','newsletter_subscriptions') LOOP
    sequence_name := pg_get_serial_sequence(format('public.%I',item.table_name),item.column_name);
    IF sequence_name IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated, service_role',sequence_name);
      IF item.table_name IN ('contact_messages','newsletter_subscriptions') THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO anon',sequence_name); END IF;
    END IF;
  END LOOP;
END $$;

-- Preserve other buckets' policies, but impose restrictive write checks for this bucket.
CREATE POLICY store_images_anon_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (bucket_id<>'product-image');
CREATE POLICY store_images_anon_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon USING (bucket_id<>'product-image') WITH CHECK (bucket_id<>'product-image');
CREATE POLICY store_images_anon_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon USING (bucket_id<>'product-image');
CREATE POLICY store_images_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id<>'product-image' OR (SELECT private.is_store_admin()));
CREATE POLICY store_images_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id<>'product-image' OR (SELECT private.is_store_admin())) WITH CHECK (bucket_id<>'product-image' OR (SELECT private.is_store_admin()));
CREATE POLICY store_images_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (bucket_id<>'product-image' OR (SELECT private.is_store_admin()));
CREATE POLICY store_images_admin ON storage.objects FOR ALL TO authenticated USING (bucket_id='product-image' AND (SELECT private.is_store_admin())) WITH CHECK (bucket_id='product-image' AND (SELECT private.is_store_admin()));
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'] WHERE id='product-image';

CREATE TABLE private.checkout_limits(user_id uuid PRIMARY KEY,window_start timestamptz NOT NULL,attempts integer NOT NULL);
CREATE OR REPLACE FUNCTION public.consume_checkout_limit(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE attempt_count integer;
BEGIN
  INSERT INTO private.checkout_limits AS limits VALUES(p_user_id,now(),1)
  ON CONFLICT(user_id) DO UPDATE SET
    attempts=CASE WHEN limits.window_start < now()-interval '5 minutes' THEN 1 ELSE limits.attempts+1 END,
    window_start=CASE WHEN limits.window_start < now()-interval '5 minutes' THEN now() ELSE limits.window_start END
  RETURNING attempts INTO attempt_count;
  RETURN attempt_count<=5;
END $$;
REVOKE ALL ON FUNCTION public.consume_checkout_limit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_checkout_limit(uuid) TO service_role;

CREATE TABLE private.payment_receipts(
  payment_id text PRIMARY KEY, tracking_id text UNIQUE, amount_paise bigint NOT NULL,
  currency text NOT NULL CHECK(currency='INR'), payment_status text NOT NULL CHECK(payment_status IN ('SUCCESS','FAILED')), recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON private.checkout_limits TO service_role;
GRANT SELECT,INSERT ON private.payment_receipts TO service_role;
CREATE OR REPLACE FUNCTION public.record_gateway_payment(p_payment_id text,p_amount_paise bigint,p_currency text,p_status text,p_tracking_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target public.orders%ROWTYPE; receipt private.payment_receipts%ROWTYPE; inserted_id text; item jsonb;
BEGIN
  IF p_currency IS NULL OR p_amount_paise IS NULL OR p_status IS NULL OR p_currency<>'INR' OR p_amount_paise<=0 OR p_status NOT IN ('SUCCESS','FAILED') OR (p_status='SUCCESS' AND coalesce(p_tracking_id,'')='') THEN RETURN jsonb_build_object('accepted',false); END IF;
  SELECT * INTO target FROM public.orders WHERE payment_id::text=p_payment_id FOR UPDATE;
  IF NOT FOUND OR round(target.total_amount::numeric*100) IS DISTINCT FROM p_amount_paise THEN RETURN jsonb_build_object('accepted',false); END IF;
  SELECT * INTO receipt FROM private.payment_receipts WHERE payment_id=p_payment_id;
  IF FOUND THEN
    RETURN jsonb_build_object('accepted',receipt.amount_paise=p_amount_paise AND receipt.currency=p_currency AND receipt.payment_status=p_status AND receipt.tracking_id IS NOT DISTINCT FROM p_tracking_id,'payment_status',target.payment_status);
  END IF;
  -- Existing terminal payments are not rewritten by callbacks, including a late failure.
  IF upper(target.payment_status) IN ('SUCCESS','PAID','COMPLETED') THEN RETURN jsonb_build_object('accepted',p_status='SUCCESS','payment_status',target.payment_status); END IF;
  IF upper(target.payment_status) IS DISTINCT FROM 'PENDING' THEN RETURN jsonb_build_object('accepted',false); END IF;
  INSERT INTO private.payment_receipts(payment_id,tracking_id,amount_paise,currency,payment_status)
    VALUES(p_payment_id,p_tracking_id,p_amount_paise,p_currency,p_status)
    ON CONFLICT DO NOTHING RETURNING payment_id INTO inserted_id;
  IF inserted_id IS NULL THEN RETURN jsonb_build_object('accepted',false); END IF;
  UPDATE public.orders SET payment_status=p_status,order_status=CASE WHEN p_status='SUCCESS' THEN 'CONFIRMED' ELSE 'CANCELLED' END WHERE id=target.id;
  IF p_status='SUCCESS' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(target.product_list::jsonb) LOOP
      DELETE FROM public.cart_items WHERE user_id=target.user_id AND product_id::text=item->>'product_id' AND quantity<=(item->>'quantity')::integer;
      UPDATE public.cart_items SET quantity=quantity-(item->>'quantity')::integer WHERE user_id=target.user_id AND product_id::text=item->>'product_id';
    END LOOP;
  END IF;
  RETURN jsonb_build_object('accepted',true,'payment_status',p_status);
END $$;
REVOKE ALL ON FUNCTION public.record_gateway_payment(text,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_gateway_payment(text,bigint,text,text,text) TO service_role;
COMMIT;
