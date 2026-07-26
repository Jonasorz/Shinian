import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
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

const databasePassword = randomBytes(24).toString("base64url");
const authSecret = randomBytes(48).toString("base64url");
const passwordHash = await hash(password, 12);

const contents = [
  `POSTGRES_PASSWORD=${databasePassword}`,
  `DATABASE_URL=postgres://shinian:${databasePassword}@localhost:5432/shinian`,
  `SHINIAN_USERNAME=${username}`,
  `SHINIAN_PASSWORD_HASH='${passwordHash}'`,
  `AUTH_SECRET=${authSecret}`,
  "",
].join("\n");

await writeFile(".env", contents, { mode: 0o600 });
console.log(`Created .env for local user "${username}".`);
