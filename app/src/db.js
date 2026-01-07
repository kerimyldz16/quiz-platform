import pkg from "pg";
const { Pool } = pkg;

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const db = new Pool({
  connectionString: mustGetEnv("DATABASE_URL"),
});

export async function testDb() {
  await db.query("SELECT 1");
  console.log("PostgreSQL connected");
}
