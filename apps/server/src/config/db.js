import pkg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const { Pool } = pkg;
// PostgreSQL Connection String configuration
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});
