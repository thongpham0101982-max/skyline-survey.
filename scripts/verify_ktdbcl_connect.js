const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({ url: 'file:' + path.resolve(__dirname, '..', 'local.db').replace(/\\/g, '/') });

async function check() {
  console.log('=== Checking KT&ĐBCL Connect Setup ===');

  const [perms, ann, req, kb] = await Promise.all([
    db.execute("SELECT roleCode, module, canRead, canCreate FROM Permission WHERE module LIKE 'KTDBCL_CONNECT%'"),
    db.execute('SELECT count(*) as count FROM KtdbclAnnouncement'),
    db.execute('SELECT count(*) as count FROM KtdbclRequest'),
    db.execute('SELECT count(*) as count FROM KtdbclKnowledgeItem')
  ]);

  console.log('Permissions count:', perms.rows.length);
  console.log('Permissions roles:', Array.from(new Set(perms.rows.map(r => r.roleCode))));
  console.log('Announcements count:', ann.rows[0].count);
  console.log('Requests count:', req.rows[0].count);
  console.log('Knowledge items count:', kb.rows[0].count);
}

check().catch(console.error);
