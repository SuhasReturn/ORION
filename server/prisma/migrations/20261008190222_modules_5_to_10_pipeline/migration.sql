-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "notes" TEXT;
ALTER TABLE "Contact" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "_JobToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_JobToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_JobToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "jobUrl" TEXT,
    "workMode" TEXT,
    "employmentType" TEXT,
    "salaryText" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "postedAt" DATETIME,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "normalizedTitle" TEXT,
    "normalizedCompany" TEXT,
    "normalizedLocation" TEXT,
    "normalizedWorkMode" TEXT,
    "normalizedEmploymentType" TEXT,
    "salaryMin" REAL,
    "salaryMax" REAL,
    "salaryCurrency" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateConfidence" REAL,
    "duplicateReason" TEXT,
    "canonicalJobId" TEXT,
    "filterStatus" TEXT NOT NULL DEFAULT 'pending',
    "filterReasons" TEXT,
    "matchScore" REAL,
    "matchRating" TEXT,
    "matchReasons" TEXT,
    "matchedSkills" TEXT,
    "missingSkills" TEXT,
    "aiSummary" TEXT,
    "aiMatchExplanation" TEXT,
    "aiProcessedAt" DATETIME,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_canonicalJobId_fkey" FOREIGN KEY ("canonicalJobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("companyId", "createdAt", "description", "discoveredAt", "employmentType", "externalId", "id", "jobUrl", "location", "postedAt", "salaryText", "source", "status", "title", "updatedAt", "workMode") SELECT "companyId", "createdAt", "description", "discoveredAt", "employmentType", "externalId", "id", "jobUrl", "location", "postedAt", "salaryText", "source", "status", "title", "updatedAt", "workMode" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_discoveredAt_idx" ON "Job"("discoveredAt");
CREATE INDEX "Job_canonicalJobId_idx" ON "Job"("canonicalJobId");
CREATE INDEX "Job_filterStatus_idx" ON "Job"("filterStatus");
CREATE INDEX "Job_matchScore_idx" ON "Job"("matchScore");
CREATE INDEX "Job_isSaved_idx" ON "Job"("isSaved");
CREATE UNIQUE INDEX "Job_source_externalId_key" ON "Job"("source", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_JobToSkill_AB_unique" ON "_JobToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_JobToSkill_B_index" ON "_JobToSkill"("B");
