import process from "node:process";
import { hash } from "bcryptjs";

const password = process.argv[2];

if (!password || password.length < 12) {
  console.error("Provide a password with at least 12 characters.");
  process.exit(1);
}

console.log(await hash(password, 12));

