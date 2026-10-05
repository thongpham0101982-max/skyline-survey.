require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const ids = [
    'cmukq64vf000eooosqdu79m7a',
    'cmukqil3u000sooosv4c52bw7',
    'cmumcwl4n0001v4dcbri1bd25',
    'cmunimi3400k6qwum55bv8bqt',
    'cmuqmasbl00076mvi0o5qalpn',
    'cmunjl2o400n3qwumqgsqd1x7',
    'cmuaz6xwz0003g97gl660ilfw',
    'cmunmqa410007uw7yo890qrdu',
    'cmunob5jl0001op69trxpftrw',
    'cmunoj1bb0001cha8y2v3wr8j',
    'cmunp00ot0001126nh7ujfa3z'
  ];
  const q = ids.map(id => `'${id}'`).join(',');
  const r = await client.execute(`SELECT id, level, date, status, academicYearId, topic, className, campusName FROM ObservationSlot WHERE id IN (${q})`);
  console.table(r.rows);
}
run();
