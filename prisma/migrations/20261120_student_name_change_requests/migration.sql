-- Migration: Student Name Change Requests (Yêu cầu đổi tên Học sinh)
-- Compatible with SQLite & LibSQL (Turso) - additive, non-destructive

CREATE TABLE IF NOT EXISTS "StudentNameChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "vnEduCode" TEXT,
    "oldName" TEXT NOT NULL,
    "newName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentNameChangeRequest_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentNameChangeRequest_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentNameChangeRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentNameChangeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_academicYearId_idx" ON "StudentNameChangeRequest"("academicYearId");
CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_campusId_idx" ON "StudentNameChangeRequest"("campusId");
CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_classId_idx" ON "StudentNameChangeRequest"("classId");
CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_studentId_idx" ON "StudentNameChangeRequest"("studentId");
CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_status_idx" ON "StudentNameChangeRequest"("status");
