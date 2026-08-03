import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";
import { listMigrationFiles } from "./migration-files.mjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
  const filenames = await listMigrationFiles(migrationsDirectory);

  for (const filename of filenames) {
    const [existing] = await sql`
      SELECT filename FROM schema_migrations WHERE filename = ${filename}
    `;

    if (existing) {
      continue;
    }

    const migration = await readFile(
      path.join(migrationsDirectory, filename),
      "utf8",
    );

    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO schema_migrations (filename) VALUES (${filename})
      `;
    });

    console.log(`Applied ${filename}`);
  }
} finally {
  await sql.end();
}
