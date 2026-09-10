const { createClient } = require('@libsql/client')
require('dotenv').config()

async function migrate() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  
  console.log('Connecting to Turso DB:', tursoUrl)
  const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })

  try {
    // 1. Add divisionCode to Department
    try {
      await client.execute(`ALTER TABLE Department ADD COLUMN divisionCode TEXT;`)
      console.log('Added divisionCode to Department')
    } catch (e) {
      console.log('divisionCode on Department note:', e.message)
    }

    // 2. Add positions to Teacher
    try {
      await client.execute(`ALTER TABLE Teacher ADD COLUMN positions TEXT;`)
      console.log('Added positions to Teacher')
    } catch (e) {
      console.log('positions on Teacher note:', e.message)
    }

    // 3. Create TeacherDivisionAssignment table
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS TeacherDivisionAssignment (
          id TEXT PRIMARY KEY,
          teacherId TEXT NOT NULL,
          divisionCode TEXT NOT NULL,
          roleInDivision TEXT DEFAULT 'TBP' NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (teacherId) REFERENCES Teacher(id) ON DELETE CASCADE
        );
      `)
      console.log('Created or verified TeacherDivisionAssignment table')
      
      await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_division ON TeacherDivisionAssignment (teacherId, divisionCode);`)
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_teacher_division_teacherId ON TeacherDivisionAssignment (teacherId);`)
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_teacher_division_code ON TeacherDivisionAssignment (divisionCode);`)
      console.log('Created indexes for TeacherDivisionAssignment')
    } catch (e) {
      console.log('TeacherDivisionAssignment table note:', e.message)
    }

    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration error:', err)
  }
}

migrate()
