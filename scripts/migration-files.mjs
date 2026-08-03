import { readdir } from "node:fs/promises";

const MIGRATION_FILENAME = /^\d{3}_[a-z0-9_]+\.sql$/;

export async function listMigrationFiles(directory) {
  return (await readdir(directory))
    .filter((filename) => MIGRATION_FILENAME.test(filename))
    .sort((left, right) => left.localeCompare(right));
}
