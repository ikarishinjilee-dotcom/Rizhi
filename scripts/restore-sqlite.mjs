import { resolve } from "node:path";
import { restoreSqliteBackup, resolveDatabasePath } from "./sqlite-backup-lib.mjs";

const backupPath = process.argv[2];
if (!backupPath) {
  console.error("Usage: npm run db:restore -- <backup-file>");
  process.exitCode = 1;
} else {
  const result = await restoreSqliteBackup({
    backupPath: resolve(backupPath),
    targetPath: resolveDatabasePath(),
  });
  console.log(`SQLite database restored: ${result.targetPath}`);
  if (result.safetyBackupPath) {
    console.log(`Pre-restore safety backup: ${result.safetyBackupPath}`);
  }
}
