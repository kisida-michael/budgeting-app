import { connection, db } from "./client.js";
import { defaultCategories } from "./default-categories.js";
import { categories } from "./schema.js";

async function main() {
  await db.insert(categories).values(defaultCategories).onConflictDoNothing();
  await connection.end();
}

main().catch(async (error) => {
  console.error("Seed failed", error);
  await connection.end();
  process.exit(1);
});
