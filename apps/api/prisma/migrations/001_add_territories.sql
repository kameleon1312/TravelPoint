-- Migration: add territories array to Explorer
ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "territories" TEXT[] NOT NULL DEFAULT '{}';
