import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw Error("Set DATABASE_URL for the dedicated demo database.");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(await readFile(new URL("../migrations/001-demo.sql", import.meta.url), "utf8"));
  });
  console.log("Sharetoo demo schema is ready.");
} finally {
  await sql.end();
}
