-- ====================================================================
-- ZyLogix - Database Schema & Initial Seed Data for Supabase (PostgreSQL)
-- "ZyLogix — tecnología y productos, simple y confiable."
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'tag',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    short_description TEXT,
    full_description TEXT,
    price NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
    old_price NUMERIC(12, 0) CHECK (old_price >= 0),
    cost NUMERIC(12, 0) CHECK (cost >= 0),
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 5,
    sku TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    is_featured BOOLEAN DEFAULT FALSE,
    is_offer BOOLEAN DEFAULT FALSE,
    discount_percentage INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Product Features Table (Dynamic specs table)
CREATE TABLE IF NOT EXISTS public.product_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Inventory Movements Log Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    change_quantity INT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('supplier_restock', 'order_sale', 'manual_adjustment', 'return')),
    notes TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percentage INT CHECK (discount_percentage BETWEEN 1 AND 100),
    discount_amount NUMERIC(12, 0),
    max_uses INT DEFAULT 100,
    used_count INT DEFAULT 0,
    min_purchase NUMERIC(12, 0) DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Discounts Table (Campaigns)
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC(12, 2) NOT NULL,
    applies_to TEXT NOT NULL CHECK (applies_to IN ('product', 'category', 'all')),
    target_id UUID,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    show_as_offer BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number SERIAL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    city TEXT DEFAULT 'Asunción',
    notes TEXT,
    subtotal NUMERIC(12, 0) NOT NULL,
    shipping_cost NUMERIC(12, 0) DEFAULT 20000,
    discount_amount NUMERIC(12, 0) DEFAULT 0,
    coupon_code TEXT,
    total NUMERIC(12, 0) NOT NULL,
    payment_method TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(12, 0) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 0) NOT NULL
);

-- 12. Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Enable all for products" ON public.products;
DROP POLICY IF EXISTS "Enable all for categories" ON public.categories;
DROP POLICY IF EXISTS "Enable all for brands" ON public.brands;
DROP POLICY IF EXISTS "Enable all for product_images" ON public.product_images;
DROP POLICY IF EXISTS "Enable all for product_features" ON public.product_features;
DROP POLICY IF EXISTS "Enable all for inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Enable all for coupons" ON public.coupons;
DROP POLICY IF EXISTS "Enable all for discounts" ON public.discounts;
DROP POLICY IF EXISTS "Enable all for orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all for order_items" ON public.order_items;

-- Public Read & Write RLS Policies
CREATE POLICY "Enable all for products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for product_images" ON public.product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for product_features" ON public.product_features FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for inventory_movements" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for discounts" ON public.discounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Admin Full Access Policy Helper Function
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- INITIAL SEED DATA FOR ZYLOGIX STORE
-- ====================================================================

-- Insert Categories
INSERT INTO public.categories (id, name, slug, description, icon) VALUES
('c1111111-1111-1111-1111-111111111111', 'Smartwatches & Wearables', 'smartwatches', 'Relojes inteligentes, bandas deportivas y accesorios wearable de última generación.', 'watch'),
('c2222222-2222-2222-2222-222222222222', 'Periféricos & Audio', 'perifericos-audio', 'Teclados mecánicos, mouses de alta precisión, auriculares inalámbricos.', 'headphones'),
('c3333333-3333-3333-3333-333333333333', 'Accesorios & Carga', 'accesorios-carga', 'Cables reforzados, cargadores GaN, hubs USB-C multidock.', 'zap'),
('c4444444-4444-4444-4444-444444444444', 'Tecnología Portátil', 'tecnologia-portatil', 'Powerbanks de alta velocidad, soportes de aluminio y más.', 'cpu')
ON CONFLICT (slug) DO NOTHING;

-- Insert Brands
INSERT INTO public.brands (id, name, slug) VALUES
('b1111111-1111-1111-1111-111111111111', 'Haylou', 'haylou'),
('b2222222-2222-2222-2222-222222222222', 'Logitech', 'logitech'),
('b3333333-3333-3333-3333-333333333333', 'Keychron', 'keychron'),
('b4444444-4444-4444-4444-444444444444', 'Anker', 'anker'),
('b5555555-5555-5555-5555-555555555555', 'Sony', 'sony')
ON CONFLICT (slug) DO NOTHING;

-- Insert Initial Products
INSERT INTO public.products (id, name, slug, short_description, full_description, price, old_price, cost, stock, min_stock, sku, category_id, brand_id, status, is_featured, is_offer, discount_percentage) VALUES
('a1111111-1111-1111-1111-111111111111', 'Smartwatch Haylou RS4 Plus', 'haylou-rs4-plus', 'Smartwatch AMOLED HD 1.78" con 105 modos deportivos, monitor de salud SpO2 y batería duradera.', 'El Haylou RS4 Plus cuenta con pantalla Retina AMOLED táctil de 1.78 pulgadas con resolución 368x448 px y 60Hz de refresco. Posee correa magnética rápida, resistencia al agua IP68 y batería de hasta 12 días de uso continuo.', 380000, 475000, 240000, 15, 5, 'ZY-HRS4-PLS', 'c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'active', true, true, 20),

('a2222222-2222-2222-2222-222222222222', 'Mouse Logitech G502 HERO', 'logitech-g502-hero', 'Mouse gamer de alto rendimiento con sensor HERO 25K, 11 botones programables y pesos ajustables.', 'Equipado con el sensor óptico de última generación HERO 25K para máxima precisión de seguimiento sin aceleración. Incluye 5 pesas de 3.6g y respuesta ultrarrápida de 1ms.', 320000, 390000, 210000, 4, 5, 'ZY-LOG-G502', 'c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'active', true, true, 18),

('a3333333-3333-3333-3333-333333333333', 'Teclado Mecánico Keychron K2 Wireless', 'keychron-k2-v2', 'Teclado mecánico compacto 75% Bluetooth / USB-C para Mac y Windows con interruptores Gateron Brown.', 'Keychron K2 es un teclado mecánico inalámbrico con retroiluminación RGB, batería de 4000 mAh que ofrece hasta 72 horas de escritura y compatibilidad nativa con Mac/iOS y Windows/Android.', 690000, 750000, 480000, 8, 3, 'ZY-KEY-K2V2', 'c2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'active', true, false, 0),

('a4444444-4444-4444-4444-444444444444', 'Auriculares Inalámbricos Sony WH-1000XM5', 'sony-wh1000xm5', 'Auriculares circumaurales con la mejor cancelación de ruido de la industria y calidad de llamada HD.', 'Con dos procesadores y ocho micrófonos para una cancelación de ruido sin precedentes. Controlador de 30 mm diseñado con precisión y batería de 30 horas con carga rápida.', 2150000, 2400000, 1600000, 3, 2, 'ZY-SNY-XM5', 'c2222222-2222-2222-2222-222222222222', 'b5555555-5555-5555-5555-555555555555', 'active', true, true, 10),

('a5555555-5555-5555-5555-555555555555', 'Hub USB-C Anker PowerExpand 7-en-1', 'anker-hub-7in1', 'Adaptador multiporta USB-C 4K HDMI, carga rápida Power Delivery 100W, lectores SD/TF y USB 3.0.', 'Convierte un solo puerto USB-C en 7 puertos de alta velocidad: HDMI 4K@60Hz, passthrough Power Delivery 100W, 2 puertos USB-A 3.0 y ranuras para tarjetas SD y MicroSD.', 290000, 340000, 175000, 18, 5, 'ZY-ANK-HUB7', 'c3333333-3333-3333-3333-333333333333', 'b4444444-4444-4444-4444-444444444444', 'active', false, false, 0)
ON CONFLICT (slug) DO NOTHING;

-- Product Features (Ficha Técnica)
INSERT INTO public.product_features (product_id, feature_name, feature_value) VALUES
('a1111111-1111-1111-1111-111111111111', 'Pantalla', '1.78" Retina AMOLED (368x448 px, 60Hz)'),
('a1111111-1111-1111-1111-111111111111', 'Bluetooth', '5.3 Ultra estable'),
('a1111111-1111-1111-1111-111111111111', 'Resistencia', 'Certificación IP68 (Sumergible 1.5m)'),
('a1111111-1111-1111-1111-111111111111', 'Batería', 'Hasta 12 días de autonomía'),
('a1111111-1111-1111-1111-111111111111', 'Compatibilidad', 'Android 6.0+ / iOS 11.0+'),

('a2222222-2222-2222-2222-222222222222', 'Sensor', 'HERO 25K (100 a 25.600 DPI)'),
('a2222222-2222-2222-2222-222222222222', 'Botones', '11 botones totalmente programables'),
('a2222222-2222-2222-2222-222222222222', 'Iluminación', 'LIGHTSYNC RGB sincronizable'),
('a2222222-2222-2222-2222-222222222222', 'Cable', 'Trenzados reforzados de 2.1 m'),

('a3333333-3333-3333-3333-333333333333', 'Layout', '75% compacto (84 teclas)'),
('a3333333-3333-3333-3333-333333333333', 'Switches', 'Gateron G-Pro Brown Táctiles'),
('a3333333-3333-3333-3333-333333333333', 'Conectividad', 'Bluetooth 5.1 & USB Tipo-C'),
('a3333333-3333-3333-3333-333333333333', 'Batería', '4000 mAh (Hasta 72h con RGB)');

-- Initial Coupon
INSERT INTO public.coupons (code, discount_percentage, min_purchase, max_uses, expires_at, is_active) VALUES
('ZYLO10', 10, 100000, 100, NOW() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;

-- Initial Inventory Movements History
INSERT INTO public.inventory_movements (product_id, change_quantity, type, notes) VALUES
('a1111111-1111-1111-1111-111111111111', 20, 'supplier_restock', 'Lote de importación inicial de Haylou RS4 Plus'),
('a1111111-1111-1111-1111-111111111111', -3, 'order_sale', 'Venta inicial tienda física / online'),
('a1111111-1111-1111-1111-111111111111', -2, 'order_sale', 'Pedido #1024'),
('a2222222-2222-2222-2222-222222222222', 10, 'supplier_restock', 'Stock inicial Logitech G502'),
('a2222222-2222-2222-2222-222222222222', -6, 'order_sale', 'Pedidos recientes online');
