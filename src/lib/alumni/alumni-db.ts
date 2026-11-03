import { createClient, Client } from '@libsql/client';
import * as path from 'path';

let localClientInstance: Client | null = null;

export function getAlumniDb(): Client {
  if (!localClientInstance) {
    const dbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
    localClientInstance = createClient({
      url: `file:${dbPath}`
    });
  }
  return localClientInstance;
}

export function getCloudAlumniDb(): Client | null {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return null;
}
