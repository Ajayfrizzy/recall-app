import { DatabaseSync } from 'node:sqlite';

export function verifyDatabase(path: string, makeStandalone = false): void {
  const database = new DatabaseSync(path, { readOnly: !makeStandalone });
  try {
    if (makeStandalone) database.exec('PRAGMA journal_mode = DELETE');
    const rows = database.prepare('PRAGMA integrity_check').all() as Array<{
      integrity_check: string;
    }>;
    if (rows.length !== 1 || rows[0]?.integrity_check !== 'ok') {
      throw new Error(`SQLite integrity check failed for ${path}.`);
    }
  } finally {
    database.close();
  }
}
