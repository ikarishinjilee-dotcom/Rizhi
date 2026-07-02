import { access, copyFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

export function resolveDatabasePath(cwd = process.cwd(), env = process.env) {
  if (env.RIZHI_API_SQLITE_PATH) return resolve(cwd, env.RIZHI_API_SQLITE_PATH);
  if (env.RIZHI_API_DATA_PATH) return resolve(cwd, `${env.RIZHI_API_DATA_PATH}.sqlite`);
  return resolve(cwd, ".data", "rizhi-api.db");
}

export async function createSqliteBackup({
  sourcePath = resolveDatabasePath(),
  destinationPath,
  backupDirectory = join(dirname(sourcePath), "backups"),
} = {}) {
  await access(sourcePath);
  await mkdir(backupDirectory, { recursive: true });
  const outputPath = resolve(destinationPath ?? join(
    backupDirectory,
    `rizhi-${fileTimestamp()}.sqlite`,
  ));
  await mkdir(dirname(outputPath), { recursive: true });
  await rm(outputPath, { force: true });

  const database = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    assertHealthyDatabase(database, sourcePath);
    await backup(database, outputPath);
  } finally {
    database.close();
  }
  assertHealthyDatabaseFile(outputPath);
  return outputPath;
}

export async function restoreSqliteBackup({
  backupPath,
  targetPath = resolveDatabasePath(),
} = {}) {
  if (!backupPath) throw new Error("Backup path is required.");
  const sourcePath = resolve(backupPath);
  const resolvedTarget = resolve(targetPath);
  if (sourcePath === resolvedTarget) throw new Error("Backup and target paths must be different.");
  assertHealthyDatabaseFile(sourcePath);
  await mkdir(dirname(resolvedTarget), { recursive: true });

  let safetyBackupPath;
  if (await exists(resolvedTarget)) {
    safetyBackupPath = await createSqliteBackup({
      sourcePath: resolvedTarget,
      backupDirectory: join(dirname(resolvedTarget), "backups"),
      destinationPath: join(
        dirname(resolvedTarget),
        "backups",
        `pre-restore-${fileTimestamp()}.sqlite`,
      ),
    });
  }

  const temporaryPath = `${resolvedTarget}.restore-${process.pid}.tmp`;
  const rollbackPath = `${resolvedTarget}.restore-${process.pid}.rollback`;
  await rm(temporaryPath, { force: true });
  await rm(rollbackPath, { force: true });
  await copyFile(sourcePath, temporaryPath);
  assertHealthyDatabaseFile(temporaryPath);

  const targetExists = await exists(resolvedTarget);
  try {
    if (targetExists) await rename(resolvedTarget, rollbackPath);
    await rm(`${resolvedTarget}-wal`, { force: true });
    await rm(`${resolvedTarget}-shm`, { force: true });
    await rename(temporaryPath, resolvedTarget);
    assertHealthyDatabaseFile(resolvedTarget);
    await rm(rollbackPath, { force: true });
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (await exists(rollbackPath)) {
      await rm(resolvedTarget, { force: true });
      await rename(rollbackPath, resolvedTarget);
    }
    throw error;
  }

  return { targetPath: resolvedTarget, safetyBackupPath };
}

function assertHealthyDatabaseFile(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    assertHealthyDatabase(database, path);
  } finally {
    database.close();
  }
}

function assertHealthyDatabase(database, path) {
  const integrity = database.prepare("PRAGMA integrity_check").get();
  if (integrity?.integrity_check !== "ok") {
    throw new Error(`SQLite integrity check failed: ${path}`);
  }
  const appTable = database.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name IN ('app_state', 'schema_migrations')
    LIMIT 1
  `).get();
  if (!appTable) throw new Error(`Not a Rizhi SQLite database: ${path}`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
