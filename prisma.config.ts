import { defineConfig } from "@prisma/config";
import * as fs from "fs";
import * as path from "path";

// Load .env.local for Prisma CLI (Next.js loads it automatically at runtime,
// but the Prisma CLI does not)
const envLocal = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  const lines = fs.readFileSync(envLocal, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export default defineConfig({
  migrations: {
    seed: "ts-node --project tsconfig.seed.json prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
