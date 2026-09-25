import 'dotenv/config';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { getAccessConfig } from '../services/access-control.js';
import { verifyDatabase } from './sqlite-utils.js';

const sourcePath = getAccessConfig().databasePath;
if (!existsSync(sourcePath)) throw new Error(`SQLite database does not exist: ${sourcePath}`);

const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const defaultDirectory = resolve(process.env.RECALL_BACKUP_DIR?.trim() || './backups');
const destinationPath = resolve(
  process.argv[2] || `${defaultDirectory}/recall-access-${timestamp}.sqlite`,
);

if (destinationPath === sourcePath)
  throw new Error('Backup destination must differ from live database.');
if (existsSync(destinationPath))
  throw new Error(`Backup destination already exists: ${destinationPath}`);

mkdirSync(dirname(destinationPath), { recursive: true });
const source = new DatabaseSync(sourcePath, { readOnly: true });
try {
  await backup(source, destinationPath);
} finally {
  source.close();
}

chmodSync(destinationPath, 0o600);
verifyDatabase(destinationPath, true);
console.log(`Verified SQLite backup: ${basename(destinationPath)}`);
