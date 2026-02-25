-- Add price estimation columns to list_items
-- Run this migration manually on Supabase

ALTER TABLE public.list_items
  ADD COLUMN IF NOT EXISTS estimated_price_min numeric NULL,
  ADD COLUMN IF NOT EXISTS estimated_price_max numeric NULL,
  ADD COLUMN IF NOT EXISTS estimated_store text NULL,
  ADD COLUMN IF NOT EXISTS price_confidence text NULL,
  ADD COLUMN IF NOT EXISTS price_estimated_at timestamptz NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.list_items.estimated_price_min IS 'AI-estimated minimum retail price in EUR (€)';
COMMENT ON COLUMN public.list_items.estimated_price_max IS 'AI-estimated maximum retail price in EUR (€)';
COMMENT ON COLUMN public.list_items.estimated_store IS 'Most likely store for this product (Billa, Kaufland, Lidl, etc.)';
COMMENT ON COLUMN public.list_items.price_confidence IS 'Confidence level: high, medium, or low';
COMMENT ON COLUMN public.list_items.price_estimated_at IS 'Timestamp of when the price was estimated — re-fetch if older than 24h';
