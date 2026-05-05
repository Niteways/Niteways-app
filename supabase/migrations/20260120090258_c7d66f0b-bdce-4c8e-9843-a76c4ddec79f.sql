-- Add card_size and card_mode columns to city_advertising_cards
ALTER TABLE city_advertising_cards 
ADD COLUMN IF NOT EXISTS card_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS card_mode text DEFAULT 'custom';

-- Add comment describing the columns
COMMENT ON COLUMN city_advertising_cards.card_size IS 'Card horizontal size: small, medium, large, full';
COMMENT ON COLUMN city_advertising_cards.card_mode IS 'Card mode: photo (image only) or custom (title/subtitle/colors)';