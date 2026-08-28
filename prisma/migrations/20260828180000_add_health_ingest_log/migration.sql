-- CreateTable
CREATE TABLE "HealthIngestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "via" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "daysReceived" INTEGER NOT NULL DEFAULT 0,
    "workoutsReceived" INTEGER NOT NULL DEFAULT 0,
    "daysWritten" INTEGER NOT NULL DEFAULT 0,
    "workoutsCreated" INTEGER NOT NULL DEFAULT 0,
    "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HealthIngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthIngestLog_userId_at_idx" ON "HealthIngestLog"("userId", "at");

-- AddForeignKey
ALTER TABLE "HealthIngestLog" ADD CONSTRAINT "HealthIngestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
