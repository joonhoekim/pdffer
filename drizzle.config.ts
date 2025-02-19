import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schemas/*.ts",
  out: "./db/migrations",
});
