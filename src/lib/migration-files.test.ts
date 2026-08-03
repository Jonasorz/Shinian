import path from "node:path";
import { describe, expect, it } from "vitest";
import { listMigrationFiles } from "../../scripts/migration-files.mjs";

describe("database migration discovery", () => {
  it("discovers every ordered SQL migration including attachment thumbnails", async () => {
    const migrations = await listMigrationFiles(
      path.join(process.cwd(), "db", "migrations"),
    );

    expect(migrations).toEqual([
      "001_init.sql",
      "002_tasks.sql",
      "003_import_batches.sql",
      "004_notifications_recurrence.sql",
      "005_attachments.sql",
      "006_attachment_thumbnails.sql",
      "007_task_lists.sql",
    ]);
  });
});
