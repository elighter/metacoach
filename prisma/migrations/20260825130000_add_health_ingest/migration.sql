-- AlterTable
ALTER TABLE "User" ADD COLUMN "activityAuto" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'planned';

-- CreateTable
CREATE TABLE "HealthIngestToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthIngestToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthIngestToken_userId_key" ON "HealthIngestToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthIngestToken_token_key" ON "HealthIngestToken"("token");

-- AddForeignKey
ALTER TABLE "HealthIngestToken" ADD CONSTRAINT "HealthIngestToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
