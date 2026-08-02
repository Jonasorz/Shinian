import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

let contents = await readFile(".env", "utf8").catch(() => "");

function value(name) {
  const match = contents.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1]?.trim() || null;
}

function setMissing(name, nextValue) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(contents)) {
    if (!value(name)) contents = contents.replace(pattern, `${name}=${nextValue}`);
  } else {
    if (contents && !contents.endsWith("\n")) contents += "\n";
    contents += `${name}=${nextValue}\n`;
  }
}

setMissing("CRON_SECRET", randomBytes(48).toString("base64url"));
setMissing("BACKUP_RETENTION_DAYS", "30");

await writeFile(".env", contents, { mode: 0o600 });
console.log("Runtime backup configuration is ready.");
