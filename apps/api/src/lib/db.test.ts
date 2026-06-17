import { describe, expect, it } from 'vitest';
import { createPool } from './db';

describe('createPool', () => {
  it('normalizes sslmode before passing the connection string to pg', async () => {
    const pool = createPool(
      'postgresql://user:pass@db.example.com:5432/travelpoint?sslmode=require&application_name=test',
    );

    expect(pool.options.connectionString).not.toContain('sslmode=');
    expect(pool.options.connectionString).toContain('application_name=test');
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: false });

    await pool.end();
  });
});
