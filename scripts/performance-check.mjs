import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const started = performance.now();

try {
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO memos (id, content, created_at, updated_at)
      SELECT gen_random_uuid(),
        '性能验收记录 ' || n || ' #性能测试',
        now() - (n || ' minutes')::interval,
        now()
      FROM generate_series(1, 10000) AS n
    `;

    const listStarted = performance.now();
    await tx`SELECT id, content FROM memos WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500`;
    const listMs = performance.now() - listStarted;

    const searchStarted = performance.now();
    await tx`SELECT id FROM memos WHERE deleted_at IS NULL AND content ILIKE ${"%#性能测试%"} LIMIT 200`;
    const searchMs = performance.now() - searchStarted;

    console.log(JSON.stringify({ rows: 10000, listMs, searchMs }, null, 2));
    if (listMs > 1000 || searchMs > 1500) {
      throw new Error("Performance acceptance threshold exceeded");
    }

    throw new Error("__ROLLBACK_PERFORMANCE_FIXTURE__");
  });
} catch (error) {
  if (!(error instanceof Error) || error.message !== "__ROLLBACK_PERFORMANCE_FIXTURE__") {
    throw error;
  }
} finally {
  await sql.end();
}

console.log(`Performance check completed in ${(performance.now() - started).toFixed(1)} ms; fixture rolled back.`);
