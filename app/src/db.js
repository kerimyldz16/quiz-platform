import pkg from "pg";
const { Pool } = pkg;

export const db = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export async function testDb() {
  await db.query("SELECT 1");
  console.log("PostgreSQL connected");
}
