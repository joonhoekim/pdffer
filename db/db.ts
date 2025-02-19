import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 256, //connection pool size
});

export const db = drizzle(pool);

// 초기 연결 테스트
const testConnection = async () => {
  try {
    const result = await db.execute(sql`select 1`);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

testConnection();
