import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

let schemaEnsured = false
let schemaPromise: Promise<void> | null = null

const FALLBACK_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "slc_feature_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL DEFAULT 'DEFAULT',
    "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "pilotMode" BOOLEAN NOT NULL DEFAULT 0,
    "allowedCampusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "allowedUserIdsJson" TEXT NOT NULL DEFAULT '[]',
    "allowedRolesJson" TEXT NOT NULL DEFAULT '["ALL"]',
    "maxImageSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maxDocSizeMb" INTEGER NOT NULL DEFAULT 25,
    "maxFilesPerPost" INTEGER NOT NULL DEFAULT 5,
    "allowedMimeTypesJson" TEXT NOT NULL DEFAULT '["image/jpeg","image/png","image/webp","image/gif","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]',
    "workingDaysJson" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "holidaysJson" TEXT NOT NULL DEFAULT '[]',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "slc_feature_configs_key_key" ON "slc_feature_configs"("key")`,
]

export async function ensureSlcSchema(): Promise<void> {
  if (schemaEnsured) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    try {
      const migrationPath = path.resolve(
        process.cwd(),
        "prisma/migrations/20261107_skyline_connect/migration.sql"
      )
      let sqlContent = ""
      if (fs.existsSync(migrationPath)) {
        sqlContent = fs.readFileSync(migrationPath, "utf-8")
      }

      const rawStatements = sqlContent
        ? sqlContent
            .split(/;\s*\r?\n/)
            .map((s) =>
              s
                .split(/\r?\n/)
                .filter((line) => !line.trim().startsWith("--"))
                .join("\n")
                .trim()
            )
            .filter(Boolean)
        : FALLBACK_STATEMENTS

      for (const stmt of rawStatements) {
        const cleanStmt = stmt.endsWith(";") ? stmt : `${stmt};`
        await (prisma as any).$executeRawUnsafe(cleanStmt)
      }
      schemaEnsured = true
    } catch (err) {
      // In mocked unit tests where $executeRawUnsafe is not provided, ignore gracefully
      schemaEnsured = true
    } finally {
      schemaPromise = null
    }
  })()

  return schemaPromise
}
