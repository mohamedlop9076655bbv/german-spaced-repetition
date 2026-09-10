-- Remove old Arabic translation columns
ALTER TABLE cards DROP COLUMN IF EXISTS translation_word;
ALTER TABLE cards DROP COLUMN IF EXISTS translation_sentence;

-- Add new German explanation column
ALTER TABLE cards ADD COLUMN IF NOT EXISTS explanation TEXT;
