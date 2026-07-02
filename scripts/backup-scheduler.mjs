import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createSqliteBackup, resolveDatabasePath } from "./sqlite-backup-lib.mjs";

export async function runBackupScheduler(env = process.env) {
  const intervalHours = positiveNumber(env.RIZHI_BACKUP_INTERVAL_HOURS, 24);
  const retentionCount = positiveInteger(env.RIZHI_BACKUP_RETENTION_COUNT, 14);
  const sourcePath = resolveDatabasePath(process.cwd(), env);
  const backupDirectory = env.RIZHI_BACKUP_DIRECTORY
    ? resolve(process.cwd(), env.RIZHI_BACKUP_DIRECTORY)
    : join(dirname(sourcePath), "backups");
  const intervalMs = intervalHours * 60 * 60 * 1000;
  let stopping = false;

  process.on("SIGINT", () => {
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });

  console.log(`Rizhi backup scheduler started: every ${intervalHours} hour(s), keep ${retentionCount}`);

  while (!stopping) {
    let nextDelay = intervalMs;
    try {
      const outputPath = await createSqliteBackup({ sourcePath, backupDirectory });
      console.log(`Scheduled SQLite backup created: ${outputPath}`);
      await removeExpiredBackups(backupDirectory, retentionCount);
    } catch (error) {
      console.error("Scheduled SQLite backup failed:", error);
      nextDelay = Math.min(intervalMs, 60_000);
    }
    if (!stopping) await delay(nextDelay);
  }
}

export async function removeExpiredBackups(directory, keepCount) {
  const names = await readdir(directory);
  const backups = [];
  for (const name of names) {
    if (!/^rizhi-.*\.sqlite$/.test(name)) continue;
    const path = join(directory, name);
    backups.push({ path, modifiedAt: (await stat(path)).mtimeMs });
  }
  backups.sort((left, right) => right.modifiedAt - left.modifiedAt);
  for (const backup of backups.slice(keepCount)) {
    await rm(backup.path, { force: true });
  }
}

function positiveNumber(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("RIZHI_BACKUP_INTERVAL_HOURS must be greater than 0.");
  }
  return number;
}

function positiveInteger(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("RIZHI_BACKUP_RETENTION_COUNT must be a positive integer.");
  }
  return number;
}

function delay(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const stop = () => {
      clearTimeout(timer);
      resolve();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await runBackupScheduler();
}
