-- Add band_classification to users table
-- Separate from the HR title/classification field
-- Links each staff member to a classification_bands entry for equity analysis
ALTER TABLE users ADD COLUMN band_classification TEXT;
