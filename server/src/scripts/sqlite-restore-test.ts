import { constants, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { getAccessConfig } from '../services/access-control.js';
import { verifyDatabase } from './sqlite-utils.js';

const [backupArgument, restoreArgument] = process.argv.slice(2);
if (!backupArgument || !restoreArgument) {
  throw new Error('Usage: sqlite-restore-test BACKUP_PATH ISOLATED_RESTORE_PATH');
}

const backupPath = resolve(backupArgument);
const restorePath = resolve(restoreArgument);
const livePath = getAccessConfig().databasePath;

if (!existsSync(backupPath)) throw new Error(`Backup does not exist: ${backupPath}`);
if (restorePath === livePath || restorePath === backupPath) {
  throw new Error('Restore-test destination must differ from the backup and live database.');
}
if (existsSync(restorePath)) throw new Error(`Restore-test destination exists: ${restorePath}`);

mkdirSync(dirname(restorePath), { recursive: true });
copyFileSync(backupPath, restorePath, constants.COPYFILE_EXCL);
verifyDatabase(restorePath);
console.log(`Verified isolated SQLite restore: ${basename(restorePath)}`);
