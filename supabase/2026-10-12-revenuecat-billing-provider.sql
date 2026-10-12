-- Adds the RevenueCat billing provider (iOS StoreKit + Google Play Billing via RevenueCat).
-- Additive and idempotent: no existing rows are touched. Must be applied to production
-- BEFORE the RevenueCat webhook is enabled, otherwise subscription writes fail.
ALTER TYPE "BillingProvider" ADD VALUE IF NOT EXISTS 'REVENUECAT';
