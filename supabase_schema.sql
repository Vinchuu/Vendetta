-- ===================================================
-- VENDETTA GANG SYSTEM - SUPABASE DATABASE MIGRATIONS
-- ===================================================

-- 1. Members Table
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rank TEXT NOT NULL DEFAULT 'recruit',
    contribution NUMERIC DEFAULT 0,
    "hasPaid" BOOLEAN DEFAULT false,
    "joinDate" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Transactions (Treasury & Vault) Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Catalog Items Table
CREATE TABLE IF NOT EXISTS public.items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    "memberId" TEXT,
    "memberName" TEXT NOT NULL,
    items JSONB NOT NULL,
    "totalAmount" NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    category TEXT DEFAULT 'arsenal',
    "orderDate" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Live Streams Table
CREATE TABLE IF NOT EXISTS public.streams (
    id TEXT PRIMARY KEY,
    "memberName" TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('kick', 'youtube', 'twitch')),
    "channelSlug" TEXT NOT NULL,
    title TEXT,
    "isLive" BOOLEAN DEFAULT true,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Gang Fund Table
CREATE TABLE IF NOT EXISTS public.gangfund (
    id TEXT PRIMARY KEY DEFAULT 'main',
    "baseAmount" NUMERIC DEFAULT 20000,
    "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedBy" TEXT DEFAULT 'system'
);

-- 7. Weekly Payment Records Table
CREATE TABLE IF NOT EXISTS public.weekly_payment_records (
    id TEXT PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "weekEnd" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    contribution NUMERIC NOT NULL,
    "hasPaid" BOOLEAN DEFAULT false,
    "paymentDate" TEXT,
    "markedBy" TEXT NOT NULL,
    "markedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gangfund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_payment_records ENABLE ROW LEVEL SECURITY;

-- Drop Existing Policies (prevents ERROR 42710 policy already exists)
DROP POLICY IF EXISTS "Public Read Access" ON public.members;
DROP POLICY IF EXISTS "Public Write Access" ON public.members;
DROP POLICY IF EXISTS "members_public_all" ON public.members;
CREATE POLICY "members_public_all" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.transactions;
DROP POLICY IF EXISTS "Public Write Access" ON public.transactions;
DROP POLICY IF EXISTS "transactions_public_all" ON public.transactions;
CREATE POLICY "transactions_public_all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.items;
DROP POLICY IF EXISTS "Public Write Access" ON public.items;
DROP POLICY IF EXISTS "items_public_all" ON public.items;
CREATE POLICY "items_public_all" ON public.items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.orders;
DROP POLICY IF EXISTS "Public Write Access" ON public.orders;
DROP POLICY IF EXISTS "orders_public_all" ON public.orders;
CREATE POLICY "orders_public_all" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.streams;
DROP POLICY IF EXISTS "Public Write Access" ON public.streams;
DROP POLICY IF EXISTS "streams_public_all" ON public.streams;
CREATE POLICY "streams_public_all" ON public.streams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.gangfund;
DROP POLICY IF EXISTS "Public Write Access" ON public.gangfund;
DROP POLICY IF EXISTS "gangfund_public_all" ON public.gangfund;
CREATE POLICY "gangfund_public_all" ON public.gangfund FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Access" ON public.weekly_payment_records;
DROP POLICY IF EXISTS "Public Write Access" ON public.weekly_payment_records;
DROP POLICY IF EXISTS "weekly_payment_records_public_all" ON public.weekly_payment_records;
CREATE POLICY "weekly_payment_records_public_all" ON public.weekly_payment_records FOR ALL USING (true) WITH CHECK (true);
