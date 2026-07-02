import { access, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";
import {
  createSqliteBackup,
  restoreSqliteBackup,
} from "../../../scripts/sqlite-backup-lib.mjs";
import { removeExpiredBackups } from "../../../scripts/backup-scheduler.mjs";

let tempDir;

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("SQLite backup scripts", () => {
  test("backs up, validates and restores a Rizhi database", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-backup-"));
    const databasePath = join(tempDir, "rizhi.sqlite");
    const backupPath = join(tempDir, "manual-backup.sqlite");
    writeTestDatabase(databasePath, "before-backup");

    const createdPath = await createSqliteBackup({
      sourcePath: databasePath,
      destinationPath: backupPath,
    });
    expect(createdPath).toBe(backupPath);

    updateValue(databasePath, "after-backup");
    const result = await restoreSqliteBackup({
      backupPath,
      targetPath: databasePath,
    });

    expect(readValue(databasePath)).toBe("before-backup");
    await expect(access(result.safetyBackupPath)).resolves.toBeUndefined();
  });

  test("keeps only the configured number of scheduled backups", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-backup-retention-"));
    const oldPath = join(tempDir, "rizhi-old.sqlite");
    const middlePath = join(tempDir, "rizhi-middle.sqlite");
    const newPath = join(tempDir, "rizhi-new.sqlite");
    await Promise.all([
      writeFile(oldPath, "old"),
      writeFile(middlePath, "middle"),
      writeFile(newPath, "new"),
    ]);
    await utimes(oldPath, new Date(1_000), new Date(1_000));
    await utimes(middlePath, new Date(2_000), new Date(2_000));
    await utimes(newPath, new Date(3_000), new Date(3_000));

    await removeExpiredBackups(tempDir, 2);

    expect((await readdir(tempDir)).sort()).toEqual([
      "rizhi-middle.sqlite",
      "rizhi-new.sqlite",
    ]);
  });
});

function writeTestDatabase(path, value) {
  const database = new DatabaseSync(path);
  try {
    database.exec(`
      CREATE TABLE app_state (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    database.prepare(`
      INSERT INTO app_state (id, version, data, updated_at)
      VALUES (1, 1, ?, '2026-07-01T00:00:00.000Z')
    `).run(JSON.stringify({ value }));
  } finally {
    database.close();
  }
}

function updateValue(path, value) {
  const database = new DatabaseSync(path);
  try {
    database.prepare("UPDATE app_state SET data = ? WHERE id = 1").run(JSON.stringify({ value }));
  } finally {
    database.close();
  }
}

function readValue(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const row = database.prepare("SELECT data FROM app_state WHERE id = 1").get();
    return JSON.parse(row.data).value;
  } finally {
    database.close();
  }
}
