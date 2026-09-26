-- ============================================================
-- ProteinPrice v1.2 — Suporte a Moedas e Filtros por Cidade / KM
-- ============================================================

-- 1. Adiciona coluna currency (padrão BRL)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- 2. Cria índices para acelerar filtros por moeda e cidade
CREATE INDEX IF NOT EXISTS idx_products_currency 
ON public.products (currency);

CREATE INDEX IF NOT EXISTS idx_products_city 
ON public.products (city);

-- 3. Garante que todos os registros existentes tenham moeda BRL
UPDATE public.products 
SET currency = 'BRL' 
WHERE currency IS NULL;
