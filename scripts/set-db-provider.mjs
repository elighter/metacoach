// Sets the Prisma datasource provider from DATABASE_URL's scheme.
// Prisma doesn't allow env() for `provider`, so we rewrite the one line here.
//   file:./dev.db            -> sqlite   (local POC quick-start)
//   postgres(ql)://…         -> postgresql (managed prod: Neon/Supabase)
// Runs automatically before dev/build via package.json, and is idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "../prisma/schema.prisma");

const url = process.env.DATABASE_URL ?? "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const provider = isPostgres ? "postgresql" : "sqlite";

const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]*(")/s,
  `$1${provider}$2`,
);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[db] datasource provider -> ${provider}`);
} else {
  console.log(`[db] datasource provider already ${provider}`);
}
