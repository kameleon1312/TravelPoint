-- Fix Report_exactly_one_target_check to include forumPostId and forumReplyId
-- which were added in sprint3 but the original constraint (sprint2) predates them.

ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_exactly_one_target_check";

ALTER TABLE "Report" ADD CONSTRAINT "Report_exactly_one_target_check" CHECK (
  (CASE WHEN "targetExplorerId" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "spotId"           IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "transmissionId"   IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "forumPostId"      IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "forumReplyId"     IS NOT NULL THEN 1 ELSE 0 END) = 1
);
