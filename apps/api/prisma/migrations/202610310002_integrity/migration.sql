CREATE INDEX "Round_sceneId_idx" ON "Round"("sceneId");
CREATE INDEX "Find_targetId_idx" ON "Find"("targetId");
ALTER TABLE "Target" ADD CONSTRAINT "Target_normalized_bounds" CHECK (
  "x" >= 0 AND "y" >= 0 AND "width" > 0 AND "height" > 0
  AND "x" + "width" <= 1 AND "y" + "height" <= 1
);
ALTER TABLE "Round" ADD CONSTRAINT "Round_completion_order" CHECK ("completedAt" >= "startedAt");
ALTER TABLE "Score" ADD CONSTRAINT "Score_nonnegative_time" CHECK ("elapsedMs" >= 0);
ALTER TABLE "Score" ADD CONSTRAINT "Score_name_length" CHECK (char_length("name") BETWEEN 1 AND 24);
