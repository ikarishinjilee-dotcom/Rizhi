import { resolve } from "node:path";
import { createSqliteBackup, resolveDatabasePath } from "./sqlite-backup-lib.mjs";

const destinationPath = process.argv[2] ? resolve(process.argv[2]) : undefined;
const outputPath = await createSqliteBackup({
  sourcePath: resolveDatabasePath(),
  destinationPath,
});

console.log(`SQLite backup created: ${outputPath}`);
