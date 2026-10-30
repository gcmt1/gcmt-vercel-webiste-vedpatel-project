
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}');
CREATE TABLE public.users(id uuid PRIMARY KEY REFERENCES auth.users(id),email text,name text,role text DEFAULT 'user');
CREATE TABLE public.products(id uuid PRIMARY KEY,product_name text,product_price numeric,product_discount numeric,in_stock boolean DEFAULT true);
CREATE TABLE public.cart_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),product_id uuid REFERENCES public.products(id),quantity integer NOT NULL CHECK(quantity>0));
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),payment_id text,payment_status text,order_status text,total_amount numeric,product_list jsonb);
CREATE TABLE public.product_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,product_id uuid,rating integer,review_text text);
CREATE TABLE public.contact_messages(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text,email text,phone text,message text);
CREATE TABLE public.newsletter_subscriptions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,email text);
CREATE TABLE storage.buckets(id text PRIMARY KEY,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects TO anon,authenticated,service_role;
CREATE POLICY old_open_upload ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
INSERT INTO storage.buckets(id) VALUES('product-image'),('unrelated');
-- Deliberately permissive old application policies must not survive the migration.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY unsafe_old_policy ON public.orders FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
