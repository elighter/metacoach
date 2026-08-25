-- CreateTable
CREATE TABLE "CoachAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietRecall" TEXT,
    "wakeTime" TEXT,
    "sleepTime" TEXT,
    "activityLevel" TEXT,
    "routineNote" TEXT,
    "b12" DOUBLE PRECISION,
    "vitaminD" DOUBLE PRECISION,
    "fastingInsulin" DOUBLE PRECISION,
    "homaIR" DOUBLE PRECISION,
    "tsh" DOUBLE PRECISION,
    "labNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachAssessment_userId_key" ON "CoachAssessment"("userId");

-- AddForeignKey
ALTER TABLE "CoachAssessment" ADD CONSTRAINT "CoachAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
