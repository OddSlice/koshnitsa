-- Add nutritional data columns to list_items
-- Run this migration manually on Supabase

ALTER TABLE public.list_items
  ADD COLUMN IF NOT EXISTS calories numeric NULL,
  ADD COLUMN IF NOT EXISTS protein numeric NULL,
  ADD COLUMN IF NOT EXISTS carbs numeric NULL,
  ADD COLUMN IF NOT EXISTS fat numeric NULL,
  ADD COLUMN IF NOT EXISTS nutrition_description text NULL,
  ADD COLUMN IF NOT EXISTS nutrition_estimated boolean NOT NULL DEFAULT true;

-- Add a comment for documentation
COMMENT ON COLUMN public.list_items.calories IS 'Estimated kcal per 100g';
COMMENT ON COLUMN public.list_items.protein IS 'Estimated grams of protein per 100g';
COMMENT ON COLUMN public.list_items.carbs IS 'Estimated grams of carbohydrates per 100g';
COMMENT ON COLUMN public.list_items.fat IS 'Estimated grams of fat per 100g';
COMMENT ON COLUMN public.list_items.nutrition_description IS 'AI-generated one-line product description in Bulgarian';
COMMENT ON COLUMN public.list_items.nutrition_estimated IS 'Whether nutrition data is an AI estimate (always true for now)';
