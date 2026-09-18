-- Add RANK_UP value to SignalType enum
-- PostgreSQL requires ALTER TYPE to add enum values; this is safe and non-destructive.
ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS 'RANK_UP';
