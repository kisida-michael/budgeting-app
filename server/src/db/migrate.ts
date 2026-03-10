import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connection, db } from "./client.js";

async function main() {
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

  await migrate(db, {
    migrationsFolder
  });
  await connection.end();
}

main().catch(async (error) => {
  console.error("Migration failed", error);
  await connection.end();
  process.exit(1);
});
