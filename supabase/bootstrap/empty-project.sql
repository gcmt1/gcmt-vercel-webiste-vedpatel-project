-- Opt-in bootstrap for a fresh, isolated Supabase project only. Existing tables abort the transaction.
BEGIN;
CREATE TABLE public.users(id uuid PRIMARY KEY REFERENCES auth.users(id),email text,name text,role text DEFAULT 'user');
CREATE TABLE public.products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_name text,product_price numeric,product_discount numeric,in_stock boolean DEFAULT true,size text, product_sub_description text, product_description text, product_image text,
 category text, key_benefits text,ingredients_name text,percentage text,why_choose_product text,
 ingredients_heading text,ingredients_description text,ingredients_subheading text,how_to_use_heading text,
 how_to_use_description text,pro_tips text,created_at timestamptz DEFAULT now());
CREATE TABLE public.cart_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),product_id uuid REFERENCES public.products(id),quantity integer NOT NULL CHECK(quantity>0));
CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),payment_id text,payment_status text,order_status text,total_amount numeric,product_list jsonb,user_name text,user_email text,user_phone text,address_line text,city text,state text,postal_code text,created_at timestamptz DEFAULT now(),guest_identifier text);
CREATE TABLE public.product_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),product_id uuid REFERENCES public.products(id),rating integer,review_text text,user_name text,created_at timestamptz DEFAULT now());
CREATE TABLE public.contact_messages(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text,email text,phone text,message text,subject text,created_at timestamptz DEFAULT now());
CREATE TABLE public.newsletter_subscriptions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,email text,created_at timestamptz DEFAULT now());
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
INSERT INTO storage.buckets(id,name,public) VALUES('product-image','product-image',true);
COMMIT;
