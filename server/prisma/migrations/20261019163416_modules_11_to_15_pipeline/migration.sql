/*
  Warnings:

  - You are about to drop the column `sentAt` on the `FollowUp` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ApplicationActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'interested',
    "appliedAt" DATETIME,
    "notes" TEXT,
    "source" TEXT,
    "nextAction" TEXT,
    "interviewAt" DATETIME,
    "interviewNotes" TEXT,
    "offerDetails" TEXT,
    "rejectionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("appliedAt", "createdAt", "id", "jobId", "notes", "status", "updatedAt", "userId") SELECT "appliedAt", "createdAt", "id", "jobId", "notes", "status", "updatedAt", "userId" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Application_interviewAt_idx" ON "Application"("interviewAt");
CREATE UNIQUE INDEX "Application_userId_jobId_key" ON "Application"("userId", "jobId");
CREATE TABLE "new_FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outreachId" TEXT,
    "contactId" TEXT,
    "jobId" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "Outreach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FollowUp" ("contactId", "createdAt", "id", "message", "outreachId", "scheduledAt", "status", "updatedAt") SELECT "contactId", "createdAt", "id", "message", "outreachId", "scheduledAt", "status", "updatedAt" FROM "FollowUp";
DROP TABLE "FollowUp";
ALTER TABLE "new_FollowUp" RENAME TO "FollowUp";
CREATE INDEX "FollowUp_outreachId_idx" ON "FollowUp"("outreachId");
CREATE INDEX "FollowUp_contactId_idx" ON "FollowUp"("contactId");
CREATE INDEX "FollowUp_jobId_idx" ON "FollowUp"("jobId");
CREATE INDEX "FollowUp_scheduledAt_idx" ON "FollowUp"("scheduledAt");
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");
CREATE TABLE "new_Outreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "contactId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "messageType" TEXT NOT NULL DEFAULT 'recruiter_outreach',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "lengthPreference" TEXT NOT NULL DEFAULT 'medium',
    "generationSource" TEXT NOT NULL DEFAULT 'template',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" DATETIME,
    "approvedContentHash" TEXT,
    "sentAt" DATETIME,
    "providerMessageId" TEXT,
    "responseStatus" TEXT,
    "userContext" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Outreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Outreach_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Outreach" ("channel", "contactId", "createdAt", "id", "jobId", "message", "responseStatus", "sentAt", "status", "updatedAt", "userId") SELECT "channel", "contactId", "createdAt", "id", "jobId", "message", "responseStatus", "sentAt", "status", "updatedAt", "userId" FROM "Outreach";
DROP TABLE "Outreach";
ALTER TABLE "new_Outreach" RENAME TO "Outreach";
CREATE INDEX "Outreach_userId_idx" ON "Outreach"("userId");
CREATE INDEX "Outreach_jobId_idx" ON "Outreach"("jobId");
CREATE INDEX "Outreach_contactId_idx" ON "Outreach"("contactId");
CREATE INDEX "Outreach_status_idx" ON "Outreach"("status");
CREATE INDEX "Outreach_messageType_idx" ON "Outreach"("messageType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ApplicationActivity_applicationId_idx" ON "ApplicationActivity"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationActivity_createdAt_idx" ON "ApplicationActivity"("createdAt");
