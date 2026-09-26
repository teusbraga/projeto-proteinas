-- ============================================================
-- ProteinPrice — Migração v1.1 (Supabase PostgreSQL)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. TABELA DE PINS DO MAPA (store_pins)
-- Armazena os pontos geográficos de locais cadastrados pela comunidade
CREATE TABLE IF NOT EXISTS public.store_pins (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_name  TEXT NOT NULL,
  city        TEXT,
  latitude    NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude   NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  product_name TEXT NOT NULL,
  price_per_g NUMERIC(10, 4),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para busca rápida dos últimos 100 pins
CREATE INDEX IF NOT EXISTS idx_store_pins_recent
  ON public.store_pins (created_at DESC);

-- Habilita RLS em store_pins
ALTER TABLE public.store_pins ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode consultar os pins do mapa
CREATE POLICY "Leitura pública de pins do mapa"
  ON public.store_pins
  FOR SELECT
  USING (true);

-- Usuários autenticados podem inserir pins
CREATE POLICY "Usuário insere seus próprios pins"
  ON public.store_pins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover seus próprios pins
CREATE POLICY "Usuário deleta seus próprios pins"
  ON public.store_pins
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. TRIGGER AUTOMÁTICO: Sempre que um produto com localização for salvo,
-- cria ou atualiza uma entrada correspondente em store_pins
CREATE OR REPLACE FUNCTION public.sync_product_to_store_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.store_name IS NOT NULL THEN
    INSERT INTO public.store_pins (
      product_id,
      user_id,
      place_name,
      city,
      latitude,
      longitude,
      product_name,
      price_per_g,
      created_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.store_name,
      NEW.city,
      NEW.latitude,
      NEW.longitude,
      NEW.name,
      NEW.price_per_g_protein,
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_product_pin ON public.products;
CREATE TRIGGER trg_sync_product_pin
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_to_store_pin();

-- 3. FILTRO DE 30 DIAS NO RANKING GLOBAL
-- Cria uma view otimizada que só exibe itens ativos dos últimos 30 dias
CREATE OR REPLACE VIEW public.active_ranking_30d AS
SELECT *
FROM public.products
WHERE is_active = true
  AND created_at >= (now() - INTERVAL '30 days')
ORDER BY price_per_g_protein ASC;
