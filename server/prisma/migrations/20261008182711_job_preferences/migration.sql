-- CreateTable
CREATE TABLE "JobPreferenceRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPreferenceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "JobPreferenceRole_jobPreferenceId_fkey" FOREIGN KEY ("jobPreferenceId") REFERENCES "JobPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobPreferenceLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPreferenceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "JobPreferenceLocation_jobPreferenceId_fkey" FOREIGN KEY ("jobPreferenceId") REFERENCES "JobPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobPreferenceIndustry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPreferenceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "JobPreferenceIndustry_jobPreferenceId_fkey" FOREIGN KEY ("jobPreferenceId") REFERENCES "JobPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobPreferenceRequiredSkill" (
    "jobPreferenceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    PRIMARY KEY ("jobPreferenceId", "skillId"),
    CONSTRAINT "JobPreferenceRequiredSkill_jobPreferenceId_fkey" FOREIGN KEY ("jobPreferenceId") REFERENCES "JobPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobPreferenceRequiredSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobPreferencePreferredSkill" (
    "jobPreferenceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    PRIMARY KEY ("jobPreferenceId", "skillId"),
    CONSTRAINT "JobPreferencePreferredSkill_jobPreferenceId_fkey" FOREIGN KEY ("jobPreferenceId") REFERENCES "JobPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobPreferencePreferredSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "desiredRoles" TEXT,
    "preferredLocations" TEXT,
    "preferredWorkMode" TEXT,
    "minimumExperience" INTEGER,
    "maximumExperience" INTEGER,
    "minimumSalary" INTEGER,
    "employmentType" TEXT NOT NULL DEFAULT 'any',
    "experienceLevel" TEXT NOT NULL DEFAULT 'student',
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobPreference" ("createdAt", "desiredRoles", "id", "maximumExperience", "minimumExperience", "minimumSalary", "preferredLocations", "preferredWorkMode", "updatedAt", "userId") SELECT "createdAt", "desiredRoles", "id", "maximumExperience", "minimumExperience", "minimumSalary", "preferredLocations", "preferredWorkMode", "updatedAt", "userId" FROM "JobPreference";
DROP TABLE "JobPreference";
ALTER TABLE "new_JobPreference" RENAME TO "JobPreference";
CREATE UNIQUE INDEX "JobPreference_userId_key" ON "JobPreference"("userId");
CREATE INDEX "JobPreference_userId_idx" ON "JobPreference"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "JobPreferenceRole_value_idx" ON "JobPreferenceRole"("value");

-- CreateIndex
CREATE UNIQUE INDEX "JobPreferenceRole_jobPreferenceId_value_key" ON "JobPreferenceRole"("jobPreferenceId", "value");

-- CreateIndex
CREATE INDEX "JobPreferenceLocation_value_idx" ON "JobPreferenceLocation"("value");

-- CreateIndex
CREATE UNIQUE INDEX "JobPreferenceLocation_jobPreferenceId_value_key" ON "JobPreferenceLocation"("jobPreferenceId", "value");

-- CreateIndex
CREATE INDEX "JobPreferenceIndustry_value_idx" ON "JobPreferenceIndustry"("value");

-- CreateIndex
CREATE UNIQUE INDEX "JobPreferenceIndustry_jobPreferenceId_value_key" ON "JobPreferenceIndustry"("jobPreferenceId", "value");

-- CreateIndex
CREATE INDEX "JobPreferenceRequiredSkill_skillId_idx" ON "JobPreferenceRequiredSkill"("skillId");

-- CreateIndex
CREATE INDEX "JobPreferencePreferredSkill_skillId_idx" ON "JobPreferencePreferredSkill"("skillId");
