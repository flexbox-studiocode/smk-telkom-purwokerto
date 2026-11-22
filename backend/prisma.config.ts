import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not env("DATABASE_URL"): that throws when the variable is missing, which breaks
    // `prisma generate` (run from postinstall) on machines without a .env. Commands that
    // touch the database still fail with a clear error when the URL is empty.
    url: process.env.DATABASE_URL ?? "",
  },
});
