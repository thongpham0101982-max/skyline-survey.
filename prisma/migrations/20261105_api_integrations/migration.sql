-- =============================================================================
-- MIGRATION: 20261105_api_integrations
-- Purpose: Add API Application, API Key & Access Log for external integrations
-- Principle: Additive (No existing tables modified, non-destructive)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "api_applications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "contactPerson" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "permissions" TEXT NOT NULL DEFAULT '[]',
  "allowedCampusIds" TEXT NOT NULL DEFAULT '[]',
  "allowedClassIds" TEXT NOT NULL DEFAULT '[]',
  "allowedDataScope" TEXT NOT NULL DEFAULT 'ALL',
  "expiresAt" DATETIME,
  "rateLimitRpm" INTEGER NOT NULL DEFAULT 60,
  "lastUsedAt" DATETIME,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_api_apps_status" ON "api_applications" ("status");

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "name" TEXT,
  "keyId" TEXT NOT NULL UNIQUE,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" DATETIME,
  "lastUsedAt" DATETIME,
  "revokedAt" DATETIME,
  "revokedReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_api_keys_app" FOREIGN KEY ("applicationId") REFERENCES "api_applications" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_api_keys_app" ON "api_keys" ("applicationId");
CREATE INDEX IF NOT EXISTS "idx_api_keys_hash" ON "api_keys" ("keyHash");
CREATE INDEX IF NOT EXISTS "idx_api_keys_status" ON "api_keys" ("status");

CREATE TABLE IF NOT EXISTS "api_access_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "keyId" TEXT,
  "requestId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "durationMs" INTEGER,
  "requestSummary" TEXT,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_api_logs_app" FOREIGN KEY ("applicationId") REFERENCES "api_applications" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_api_logs_app" ON "api_access_logs" ("applicationId");
CREATE INDEX IF NOT EXISTS "idx_api_logs_req" ON "api_access_logs" ("requestId");
CREATE INDEX IF NOT EXISTS "idx_api_logs_created" ON "api_access_logs" ("createdAt");
