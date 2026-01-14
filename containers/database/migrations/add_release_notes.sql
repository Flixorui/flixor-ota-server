-- Migration to add release_notes column to existing releases table
-- Run this script if you have an existing database without the release_notes column

-- Add release_notes column to releases table
ALTER TABLE releases ADD COLUMN IF NOT EXISTS release_notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN releases.release_notes IS 'Release notes provided during update publishing';
