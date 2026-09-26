-- ============================================================
-- ProteinPrice — Schema PostgreSQL (Supabase)
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Para queries de distância geográfica (futuro)
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- ============================================================
-- TABELA PRINCIPAL: products
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Dados do produto
  name                TEXT NOT NULL
                        CHECK (char_length(name) BETWEEN 2 AND 100),
  brand               TEXT
                        CHECK (brand IS NULL OR char_length(brand) <= 60),
  food_type           TEXT NOT NULL
                        CHECK (food_type IN ('animal', 'vegetal')),

  -- Dados nutricionais/financeiros
  price               NUMERIC(10, 2) NOT NULL
                        CHECK (price > 0),
  weight_g            NUMERIC(10, 2) NOT NULL
                        CHECK (weight_g > 0),
  portion_g           NUMERIC(10, 2) NOT NULL
                        CHECK (portion_g > 0),
  protein_g           NUMERIC(10, 2) NOT NULL
                        CHECK (protein_g > 0 AND protein_g <= portion_g),

  -- Coluna calculada pelo Postgres automaticamente
  -- Não inclua esta coluna em INSERTs/UPDATEs
  price_per_g_protein NUMERIC(10, 6) GENERATED ALWAYS AS (
                        (price / weight_g * portion_g) / protein_g
                      ) STORED,

  -- Foto
  photo_url           TEXT,

  -- Localização
  store_name          TEXT
                        CHECK (store_name IS NULL OR char_length(store_name) <= 120),
  city                TEXT
                        CHECK (city IS NULL OR char_length(city) <= 60),
  latitude            NUMERIC(9, 6)
                        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude           NUMERIC(9, 6)
                        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),

  -- Moderação
  is_active           BOOLEAN DEFAULT true NOT NULL,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- TRIGGER: atualiza updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ÍNDICES — para performance das queries de ranking
-- ============================================================

-- Ranking geral (mais usada)
CREATE INDEX idx_products_ranking
  ON public.products (price_per_g_protein ASC)
  WHERE is_active = true;

-- Filtro por tipo de proteína
CREATE INDEX idx_products_food_type
  ON public.products (food_type)
  WHERE is_active = true;

-- Produtos por usuário (para "minha lista")
CREATE INDEX idx_products_user_id
  ON public.products (user_id, created_at DESC);

-- Filtro por cidade (uso futuro)
CREATE INDEX idx_products_city
  ON public.products (city)
  WHERE is_active = true AND city IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY — segurança dos dados
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (inclusive anônima) pode VER produtos ativos
-- Isso permite o ranking público sem login
CREATE POLICY "Leitura pública de produtos ativos"
  ON public.products
  FOR SELECT
  USING (is_active = true);

-- Usuário autenticado pode INSERIR apenas com seu próprio user_id
CREATE POLICY "Usuário insere seus próprios produtos"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode ATUALIZAR apenas seus próprios produtos
CREATE POLICY "Usuário atualiza seus próprios produtos"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode DELETAR apenas seus próprios produtos
CREATE POLICY "Usuário deleta seus próprios produtos"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE — bucket para fotos de produtos
-- ============================================================

-- Cria bucket público (fotos são visíveis no ranking)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  true,
  5242880,   -- 5MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer um pode VER fotos (ranking público)
CREATE POLICY "Fotos de produto são públicas"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-photos');

-- Usuário autenticado pode fazer UPLOAD na sua própria pasta (user_id/arquivo)
CREATE POLICY "Usuário autenticado faz upload na sua pasta"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Usuário pode DELETAR apenas suas próprias fotos
CREATE POLICY "Usuário deleta suas próprias fotos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- VIEW: ranking público (opcional, para queries futuras)
-- ============================================================

CREATE OR REPLACE VIEW public.ranking_view AS
SELECT
  id,
  name,
  brand,
  food_type,
  price,
  weight_g,
  portion_g,
  protein_g,
  price_per_g_protein,
  photo_url,
  store_name,
  city,
  latitude,
  longitude,
  created_at
FROM public.products
WHERE is_active = true
ORDER BY price_per_g_protein ASC;

-- ============================================================
-- NOTAS DE CONFIGURAÇÃO (leia antes de rodar)
-- ============================================================

-- 1. No Supabase Dashboard > Authentication > Providers:
--    - Habilite Google
--    - Configure Client ID e Client Secret do Google Cloud Console
--    - Redirect URL: https://seu-projeto.supabase.co/auth/v1/callback

-- 2. No Google Cloud Console:
--    - Crie um OAuth 2.0 Client ID (tipo: Web application)
--    - Authorized redirect URIs: https://seu-projeto.supabase.co/auth/v1/callback

-- 3. No Supabase Dashboard > Authentication > URL Configuration:
--    - Site URL: https://seu-app.vercel.app
--    - Redirect URLs (adicione todos):
--        https://seu-app.vercel.app
--        http://localhost:5173 (para desenvolvimento)
