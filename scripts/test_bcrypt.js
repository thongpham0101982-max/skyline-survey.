const bcrypt = require('bcryptjs')

async function test() {
  const pwd = 'Skyline@123'
  const hash = '$2b$10$N/dwVS6v0SC0.aLnXy2Cbu4Ghe5xqgkg6iHkLI0rU9RQCDldsX24m'
  const match = await bcrypt.compare(pwd, hash)
  console.log("Password match result:", match)
}

test()
