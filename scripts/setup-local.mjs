import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { hash } from "bcryptjs";

const username = process.argv[2] || "owner";
const password = process.argv[3];

if (!password || password.length < 12) {
  console.error(
    "Usage: npm run setup:local -- <username> <password-at-least-12-characters>",
  );
  process.exit(1);
}

let existingEnvironment = "";
try {
  existingEnvironment = await readFile(".env", "utf8");
} catch {
  // A missing file is expected on first setup.
}

function existingValue(name) {
  const match = existingEnvironment.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match?.[1]?.replace(/^['"]|['"]$/g, "") || null;
}

const databasePassword =
  existingValue("POSTGRES_PASSWORD") ??
  randomBytes(24).toString("base64url");
const authSecret =
  existingValue("AUTH_SECRET") ?? randomBytes(48).toString("base64url");
const cronSecret =
  existingValue("CRON_SECRET") ?? randomBytes(48).toString("base64url");
const passwordHash = await hash(password, 12);
const passwordHashBase64 = Buffer.from(passwordHash, "utf8").toString(
  "base64",
);

const contents = [
  `POSTGRES_PASSWORD=${databasePassword}`,
  `DATABASE_URL=postgres://shinian:${databasePassword}@localhost:5432/shinian`,
  `SHINIAN_USERNAME=${username}`,
  `SHINIAN_PASSWORD_HASH_B64=${passwordHashBase64}`,
  `AUTH_SECRET=${authSecret}`,
  `CRON_SECRET=${cronSecret}`,
  `BACKUP_RETENTION_DAYS=${existingValue("BACKUP_RETENTION_DAYS") ?? "30"}`,
  "",
].join("\n");

await writeFile(".env", contents, { mode: 0o600 });
console.log(`Created .env for local user "${username}".`);
