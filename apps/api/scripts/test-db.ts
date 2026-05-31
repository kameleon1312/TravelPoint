import pg from 'pg';

const rawUrl = process.env['DATABASE_URL'] ?? '';
console.log('RAW URL bytes:', Buffer.from(rawUrl).toString('hex'));
console.log('RAW URL:', JSON.stringify(rawUrl));

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  database: 'travelpoint',
  ssl: false,
  password: undefined,
});

pool.connect()
  .then((client) => {
    console.log('CONNECTED OK — trust auth works');
    return client.query('SELECT current_user, version()').then((r) => {
      console.log('User:', r.rows[0]);
      client.release();
      pool.end();
    });
  })
  .catch((err: Error & { code?: string }) => {
    console.error('CONNECT FAILED:', err.code, err.message);
    pool.end();
  });
