BEGIN;

-- The original GCMT migration and merchant tables are prerequisites.
ALTER TABLE public.orders ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid, ADD COLUMN gateway_reference text;
CREATE UNIQUE INDEX store_gateway_reference_unique ON public.orders(gateway_reference) WHERE gateway_reference IS NOT NULL;
REVOKE DELETE ON public.orders FROM authenticated;
DROP POLICY orders_delete ON public.orders;
GRANT UPDATE (archived_at) ON public.orders TO authenticated;
CREATE FUNCTION private.audit_archive() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    NEW.archived_at := now();
    NEW.archived_by := auth.uid();
  ELSIF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    RAISE EXCEPTION 'Archive is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER store_order_archive BEFORE UPDATE OF archived_at ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.audit_archive();

ALTER TABLE public.cart_items ADD COLUMN variant text NOT NULL DEFAULT '';
DROP INDEX public.store_cart_owner_product_unique;
CREATE UNIQUE INDEX store_cart_owner_product_variant ON public.cart_items(user_id,product_id,variant);
CREATE TABLE private.cart_operations (
  user_id uuid NOT NULL, operation_id uuid NOT NULL, PRIMARY KEY(user_id, operation_id)
);
CREATE FUNCTION public.add_store_cart_item(p_product text,p_variant text,p_quantity integer,p_operation uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid := auth.uid(); product public.products%ROWTYPE;
BEGIN
  IF owner_id IS NULL OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 100 OR p_operation IS NULL THEN
    RAISE EXCEPTION 'Invalid cart change';
  END IF;
  INSERT INTO private.cart_operations VALUES(owner_id,p_operation) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO STRICT product FROM public.products WHERE id::text=p_product FOR SHARE;
  IF product.in_stock IS FALSE OR p_variant IS NULL OR length(p_variant)>100 OR NOT (
    (p_variant='' AND nullif(trim(to_jsonb(product)->>'size'),'') IS NULL) OR
    (p_variant<>'' AND p_variant IN (SELECT trim(v) FROM unnest(string_to_array(to_jsonb(product)->>'size',',')) v))
  ) THEN RAISE EXCEPTION 'Choose an available size'; END IF;
  INSERT INTO public.cart_items AS cart(user_id,product_id,quantity,variant)
  VALUES(owner_id,product.id,p_quantity,p_variant)
  ON CONFLICT(user_id,product_id,variant) DO UPDATE SET quantity=cart.quantity+excluded.quantity
    WHERE cart.quantity+excluded.quantity<=100;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quantity limit exceeded'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.add_store_cart_item(text,text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_store_cart_item(text,text,integer,uuid) TO authenticated;

CREATE TABLE private.order_actions (
  action_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id text NOT NULL,
  actor uuid NOT NULL, action text NOT NULL, previous_state text, next_state text, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION private.check_staff_fulfilment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous text := upper(OLD.order_status); following text := upper(NEW.order_status);
BEGIN
  -- Service-side capture can confirm an order without impersonating staff.
  IF auth.uid() IS NULL OR previous IS NOT DISTINCT FROM following THEN RETURN NEW; END IF;
  IF NOT private.is_store_admin() OR NOT coalesce(
      (following='CANCELLED' AND previous IN ('PENDING','CONFIRMED','PROCESSING')) OR
      ((upper(OLD.payment_status) IN ('SUCCESS','COMPLETED','PAID') OR OLD.payment_id LIKE 'COD-%') AND
        ((following='PROCESSING' AND previous IN ('PENDING','CONFIRMED')) OR
         (following='SHIPPED' AND previous='PROCESSING') OR (following='DELIVERED' AND previous='SHIPPED'))),false)
  THEN RAISE EXCEPTION 'Invalid fulfilment transition'; END IF;
  INSERT INTO private.order_actions(order_id,actor,action,previous_state,next_state)
    VALUES(OLD.id::text,auth.uid(),'fulfilment',previous,following);
  RETURN NEW;
END $$;
CREATE TRIGGER store_fulfilment BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.check_staff_fulfilment();

CREATE FUNCTION public.collect_store_cod(p_order text,p_actor uuid,p_note text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target public.orders%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_actor AND role='admin') OR
     length(trim(coalesce(p_note,''))) NOT BETWEEN 3 AND 160 THEN RETURN false; END IF;
  SELECT * INTO target FROM public.orders WHERE id::text=p_order AND payment_id LIKE 'COD-%' FOR UPDATE;
  IF NOT FOUND OR upper(target.payment_status) IS DISTINCT FROM 'COD_PENDING' OR
     upper(target.order_status) IN ('CANCELLED','RETURNED','REFUNDED') THEN RETURN false; END IF;
  UPDATE public.orders SET payment_status='SUCCESS' WHERE id=target.id;
  INSERT INTO private.order_actions(order_id,actor,action,previous_state,next_state)
    VALUES(p_order,p_actor,'COD collection: '||trim(p_note),'COD_PENDING','SUCCESS');
  RETURN true;
END $$;
GRANT SELECT,INSERT ON private.order_actions TO service_role;
GRANT USAGE ON SEQUENCE private.order_actions_action_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.collect_store_cod(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.collect_store_cod(text,uuid,text) TO service_role;

-- A fresh handoff after a failed or lost return requires a verified non-payable result.
CREATE TABLE private.closed_attempts (
  payment_id text PRIMARY KEY, merchant_case text NOT NULL CHECK(length(trim(merchant_case)) BETWEEN 1 AND 100),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON private.closed_attempts TO service_role;

-- A row exists only while the server can prove that it has never released a gateway form.
CREATE TABLE private.prepared_handoffs (
  payment_id text PRIMARY KEY, generation uuid NOT NULL
);
GRANT SELECT,INSERT,UPDATE,DELETE ON private.prepared_handoffs TO service_role;
CREATE INDEX store_orders_owner_created ON public.orders(user_id,created_at DESC);

-- Lock the account before checking outstanding orders. The snapshot and insert commit together.
CREATE FUNCTION public.open_store_checkout(p_owner uuid,p_attempt text,p_shipping jsonb,p_expected bigint,p_lines jsonb,p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing public.orders%ROWTYPE; line record; items jsonb := '[]'; total bigint := 0;
  unit bigint; placed public.orders%ROWTYPE; available numeric; generation_id uuid := gen_random_uuid();
  cod boolean := p_attempt LIKE 'COD-%';
BEGIN
  PERFORM id FROM public.users WHERE id=p_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing account'; END IF;
  SELECT * INTO existing FROM public.orders WHERE user_id=p_owner AND
    (payment_id=p_attempt OR (upper(payment_status) IN ('PENDING','FAILED') AND payment_id NOT LIKE 'COD-%' AND NOT EXISTS (SELECT 1 FROM private.closed_attempts x WHERE x.payment_id=orders.payment_id)))
    ORDER BY (payment_id=p_attempt) DESC,created_at,payment_id LIMIT 1 FOR UPDATE;
  IF FOUND AND (cod OR upper(existing.payment_status) IS DISTINCT FROM 'PENDING' OR NOT EXISTS
      (SELECT 1 FROM private.prepared_handoffs h WHERE h.payment_id=existing.payment_id)) THEN
    RETURN jsonb_build_object('existing',true,'payment_id',existing.payment_id);
  END IF;
  FOR line IN SELECT c.id AS cart_id,c.product_id,c.quantity,c.variant,p.product_name,p.product_price,
    coalesce(p.product_discount,0) AS discount,p.in_stock,to_jsonb(p)->>'size' AS sizes,to_jsonb(p)->>'stock' AS stock
    FROM public.cart_items c JOIN public.products p ON p.id=c.product_id
    WHERE c.user_id=p_owner ORDER BY c.product_id,c.variant FOR UPDATE OF c FOR SHARE OF p LOOP
    available := nullif(line.stock,'')::numeric;
    IF line.quantity IS NULL OR line.quantity NOT BETWEEN 1 AND 100 OR line.in_stock IS FALSE OR
      (available IS NOT NULL AND (SELECT sum(c.quantity) FROM public.cart_items c WHERE c.user_id=p_owner AND c.product_id=line.product_id)>available) OR
      line.product_price IS NULL OR line.product_price<=0 OR line.product_price>=100000000 OR
      line.product_price<>round(line.product_price,2) OR line.discount NOT BETWEEN 0 AND 99.99 OR
      NOT ((line.variant='' AND nullif(trim(line.sizes),'') IS NULL) OR
           (line.variant<>'' AND line.variant IN (SELECT trim(v) FROM unnest(string_to_array(line.sizes,',')) v))) THEN
      RETURN jsonb_build_object('invalid',true);
    END IF;
    unit := round(line.product_price*(100-line.discount));
    total := total + unit*line.quantity;
    IF unit<1 OR total>100000000 OR jsonb_array_length(items)>=100 THEN RETURN jsonb_build_object('invalid',true); END IF;
    items := items || jsonb_build_object('cart_id',line.cart_id,'product_id',line.product_id,'variant',line.variant,
      'quantity',line.quantity,'name',line.product_name,'unit_price',unit/100.0,'total_price',unit*line.quantity/100.0);
  END LOOP;
  IF total<=0 OR total IS DISTINCT FROM p_expected OR
    (SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements(p_lines) x) IS DISTINCT FROM
    (SELECT jsonb_agg(x ORDER BY x) FROM (SELECT jsonb_build_object('productId',i->>'product_id',
      'variant',i->>'variant','quantity',i->'quantity','unitPaise',round((i->>'unit_price')::numeric*100)) x
      FROM jsonb_array_elements(items) i) quoted)
  THEN RETURN jsonb_build_object('changed',true); END IF;
  IF existing.id IS NOT NULL THEN
    UPDATE public.orders SET total_amount=total/100.0,product_list=items,user_name=p_shipping->>'name',
      user_email=p_shipping->>'email',user_phone=p_shipping->>'phone',address_line=p_shipping->>'street',
      city=p_shipping->>'city',state=p_shipping->>'state',postal_code=p_shipping->>'pincode'
      WHERE id=existing.id RETURNING * INTO placed;
  ELSE
    INSERT INTO public.orders(user_id,payment_id,gateway_reference,payment_status,order_status,total_amount,product_list,user_name,user_email,
    user_phone,address_line,city,state,postal_code,created_at)
  VALUES(p_owner,p_attempt,p_reference,CASE WHEN cod THEN 'COD_PENDING' ELSE 'PENDING' END,
    CASE WHEN cod THEN 'PROCESSING' ELSE 'PENDING' END,total/100.0,items,p_shipping->>'name',p_shipping->>'email',
    p_shipping->>'phone',p_shipping->>'street',p_shipping->>'city',p_shipping->>'state',p_shipping->>'pincode',now())
  RETURNING * INTO placed;
  END IF;
  IF cod THEN
    DELETE FROM public.cart_items c USING jsonb_array_elements(items) i
      WHERE c.user_id=p_owner AND c.id::text=i->>'cart_id';
    RETURN jsonb_build_object('id',placed.id,'payment_id',placed.payment_id,'cod',true);
  END IF;
  INSERT INTO private.prepared_handoffs VALUES(placed.payment_id,generation_id)
    ON CONFLICT(payment_id) DO UPDATE SET generation=excluded.generation;
  RETURN jsonb_build_object('id',placed.id,'total_paise',total,'payment_id',placed.payment_id,
    'gateway_reference',placed.gateway_reference,'generation',generation_id);
END $$;
REVOKE ALL ON FUNCTION public.open_store_checkout(uuid,text,jsonb,bigint,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.open_store_checkout(uuid,text,jsonb,bigint,jsonb,text) TO service_role;

-- Claim only the latest quoted snapshot. Once claimed, delivery to the browser is ambiguous.
CREATE FUNCTION public.release_store_handoff(p_owner uuid,p_payment_id text,p_generation uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  PERFORM id FROM public.orders WHERE user_id=p_owner AND payment_id=p_payment_id AND upper(payment_status)='PENDING' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM private.prepared_handoffs WHERE payment_id=p_payment_id AND generation=p_generation;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.release_store_handoff(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_store_handoff(uuid,text,uuid) TO service_role;

CREATE FUNCTION public.close_unpaid_store_attempt(p_payment_id text,p_merchant_case text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM id FROM public.orders WHERE payment_id=p_payment_id AND payment_id NOT LIKE 'COD-%'
    AND upper(payment_status) IN ('PENDING','FAILED') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt is not unresolved'; END IF;
  INSERT INTO private.closed_attempts(payment_id,merchant_case) VALUES(p_payment_id,p_merchant_case);
  UPDATE public.orders SET payment_status='FAILED' WHERE payment_id=p_payment_id;
END $$;
REVOKE ALL ON FUNCTION public.close_unpaid_store_attempt(text,text) FROM PUBLIC,anon,authenticated,service_role;
-- An authorized database operator may execute this after checking final non-payability with the merchant.

CREATE TABLE private.gateway_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id text NOT NULL, tracking_id text, amount_paise bigint NOT NULL, currency text NOT NULL,
  observed_status text NOT NULL, disposition text NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON private.gateway_events(payment_id,received_at);
GRANT SELECT,INSERT ON private.gateway_events TO service_role;
GRANT USAGE ON SEQUENCE private.gateway_events_event_id_seq TO service_role;
GRANT UPDATE (tracking_id,payment_status,recorded_at) ON private.payment_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.record_gateway_payment(p_payment_id text,p_amount_paise bigint,p_currency text,p_status text,p_tracking_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target public.orders%ROWTYPE; receipt private.payment_receipts%ROWTYPE; outcome text; item jsonb; cart public.cart_items%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.orders WHERE payment_id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('accepted',false); END IF;
  SELECT * INTO receipt FROM private.payment_receipts WHERE payment_id=p_payment_id;
  IF p_amount_paise IS NULL OR p_currency IS NULL OR p_status IS NULL THEN RETURN jsonb_build_object('accepted',false); END IF;
  IF target.payment_id LIKE 'COD-%' OR EXISTS (SELECT 1 FROM private.prepared_handoffs h WHERE h.payment_id=p_payment_id) THEN
    outcome := 'review';
  ELSIF p_currency<>'INR' OR p_amount_paise<=0 OR round(target.total_amount*100) IS DISTINCT FROM p_amount_paise OR
     p_status NOT IN ('SUCCESS','FAILED') OR (p_status='SUCCESS' AND coalesce(p_tracking_id,'') !~ '^[A-Za-z0-9_-]{1,100}$') THEN
    outcome := 'mismatch';
  ELSIF EXISTS (SELECT 1 FROM private.closed_attempts x WHERE x.payment_id=p_payment_id) AND p_status='SUCCESS' THEN
    outcome := 'review';
  ELSIF receipt.payment_status=p_status AND receipt.tracking_id IS NOT DISTINCT FROM p_tracking_id THEN
    outcome := 'duplicate';
  ELSIF upper(target.payment_status) IS NULL OR upper(target.payment_status) NOT IN ('PENDING','FAILED') OR
    (upper(target.payment_status)='FAILED' AND (p_status<>'SUCCESS' OR receipt.payment_status IS DISTINCT FROM 'FAILED')) OR
    (receipt.tracking_id IS NOT NULL AND receipt.tracking_id IS DISTINCT FROM p_tracking_id) THEN
    outcome := 'review';
  ELSE
    BEGIN
      INSERT INTO private.payment_receipts(payment_id,tracking_id,amount_paise,currency,payment_status)
      VALUES(p_payment_id,p_tracking_id,p_amount_paise,p_currency,p_status)
      ON CONFLICT(payment_id) DO UPDATE SET tracking_id=excluded.tracking_id,payment_status=excluded.payment_status,recorded_at=now();
      outcome := 'applied';
    EXCEPTION WHEN unique_violation THEN outcome := 'tracking_conflict'; END;
    IF outcome='applied' THEN
      UPDATE public.orders SET payment_status=p_status,
        order_status=CASE WHEN p_status='SUCCESS' AND upper(order_status)='PENDING' THEN 'CONFIRMED' ELSE order_status END
        WHERE id=target.id;
      target.payment_status := p_status;
      IF p_status='SUCCESS' THEN
        -- A historical snapshot of unknown shape cannot authorize a cart change.
        FOR item IN SELECT value FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(to_jsonb(target.product_list))='array' THEN to_jsonb(target.product_list) ELSE '[]'::jsonb END)
          WHERE value ? 'cart_id' AND (value->>'quantity') ~ '^([1-9][0-9]?|100)$' LOOP
          SELECT * INTO cart FROM public.cart_items WHERE user_id=target.user_id AND product_id::text=item->>'product_id'
            AND variant=coalesce(item->>'variant','') AND id::text=item->>'cart_id' FOR UPDATE;
          IF FOUND THEN
            IF cart.quantity=(item->>'quantity')::integer THEN DELETE FROM public.cart_items WHERE id=cart.id;
            ELSIF cart.quantity>(item->>'quantity')::integer THEN UPDATE public.cart_items SET quantity=quantity-(item->>'quantity')::integer WHERE id=cart.id;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;
  INSERT INTO private.gateway_events(payment_id,tracking_id,amount_paise,currency,observed_status,disposition)
    VALUES(p_payment_id,p_tracking_id,p_amount_paise,p_currency,p_status,outcome);
  RETURN jsonb_build_object('accepted',outcome IN ('applied','duplicate'),'payment_status',target.payment_status);
END $$;
-- Bind the merchant's exact wire reference before accepting either a callback or an inquiry.
CREATE FUNCTION public.record_store_response(p_payment_id text,p_reference text,p_amount_paise bigint,p_currency text,p_status text,p_tracking_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target public.orders%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.orders WHERE payment_id=p_payment_id FOR UPDATE;
  IF NOT FOUND OR coalesce(target.gateway_reference,target.payment_id) IS DISTINCT FROM p_reference THEN
    RETURN jsonb_build_object('accepted',false);
  END IF;
  RETURN public.record_gateway_payment(p_payment_id,p_amount_paise,p_currency,p_status,p_tracking_id);
END $$;
REVOKE ALL ON FUNCTION public.record_store_response(text,text,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_store_response(text,text,bigint,text,text,text) TO service_role;
CREATE VIEW private.payment_review_queue WITH (security_invoker=true) AS
SELECT o.payment_id, o.payment_status, o.total_amount, o.created_at, last_event.disposition, last_event.received_at
FROM public.orders o
LEFT JOIN LATERAL (SELECT e.disposition,e.received_at FROM private.gateway_events e
 WHERE e.payment_id=o.payment_id ORDER BY e.event_id DESC LIMIT 1) last_event ON true
WHERE o.payment_id NOT LIKE 'COD-%' AND
 ((upper(o.payment_status) IN ('PENDING','FAILED') AND NOT EXISTS (
 SELECT 1 FROM private.closed_attempts c WHERE c.payment_id=o.payment_id))
 OR EXISTS (SELECT 1 FROM private.gateway_events e WHERE e.payment_id=o.payment_id
    AND e.disposition IN ('mismatch','review','tracking_conflict')));
GRANT SELECT ON private.payment_review_queue TO service_role;
CREATE TABLE private.inquiry_schedule (
  payment_id text PRIMARY KEY, attempts integer NOT NULL, next_at timestamptz NOT NULL
);
GRANT SELECT,INSERT,UPDATE ON private.inquiry_schedule TO service_role;
CREATE FUNCTION public.claim_store_inquiries() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE candidate record; claimed jsonb := '[]';
BEGIN
  FOR candidate IN SELECT o.payment_id,o.gateway_reference FROM public.orders o
    LEFT JOIN private.inquiry_schedule q ON q.payment_id=o.payment_id
    WHERE upper(o.payment_status) IN ('PENDING','FAILED') AND o.payment_id NOT LIKE 'COD-%'
    AND NOT EXISTS (SELECT 1 FROM private.prepared_handoffs h WHERE h.payment_id=o.payment_id)
    AND o.created_at < now()-interval '15 minutes' AND NOT EXISTS (SELECT 1 FROM private.closed_attempts c WHERE c.payment_id=o.payment_id)
    AND (q.payment_id IS NULL OR (q.next_at<=now() AND q.attempts<6))
    ORDER BY o.created_at LIMIT 10 FOR UPDATE OF o SKIP LOCKED LOOP
    INSERT INTO private.inquiry_schedule AS q VALUES(candidate.payment_id,1,now()+interval '5 minutes')
    ON CONFLICT(payment_id) DO UPDATE SET attempts=q.attempts+1,next_at=now()+interval '5 minutes'*power(2,q.attempts)
      WHERE q.next_at<=now() AND q.attempts<6;
    IF FOUND THEN claimed := claimed || to_jsonb(candidate); END IF;
  END LOOP;
  RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.claim_store_inquiries() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_store_inquiries() TO service_role;
-- Bound repeat submissions at the database boundary, including direct Data API calls.
CREATE TABLE private.form_limits (channel text, identity_digest text, starts_at timestamptz NOT NULL,
  attempts integer NOT NULL, PRIMARY KEY(channel,identity_digest));
CREATE FUNCTION private.limit_store_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE identity_text text; seen integer;
BEGIN
  IF TG_TABLE_NAME='product_reviews' THEN identity_text := auth.uid()::text;
  ELSE
    IF NEW.email IS NULL OR NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
    identity_text := lower(trim(NEW.email));
  END IF;
  INSERT INTO private.form_limits AS l VALUES(TG_TABLE_NAME,md5(identity_text),now(),1)
  ON CONFLICT(channel,identity_digest) DO UPDATE SET
    attempts=CASE WHEN l.starts_at<=now()-interval '10 minutes' THEN 1 ELSE l.attempts+1 END,
    starts_at=CASE WHEN l.starts_at<=now()-interval '10 minutes' THEN now() ELSE l.starts_at END
  RETURNING attempts INTO seen;
  IF seen>5 THEN RAISE EXCEPTION 'Please try again later'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER store_contact_limit BEFORE INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION private.limit_store_submission();
CREATE TRIGGER store_subscription_limit BEFORE INSERT ON public.newsletter_subscriptions FOR EACH ROW EXECUTE FUNCTION private.limit_store_submission();
CREATE TRIGGER store_review_limit BEFORE INSERT ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION private.limit_store_submission();
COMMIT;
