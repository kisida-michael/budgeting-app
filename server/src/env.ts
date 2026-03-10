import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, ".env.local"), override: true });

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@127.0.0.1:54329/jsheehan_budget"),
  CLERK_PUBLISHABLE_KEY: optionalString,
  VITE_CLERK_PUBLISHABLE_KEY: optionalString,
  CLERK_SECRET_KEY: optionalString,
  PLAID_CLIENT_ID: optionalString,
  PLAID_SECRET: optionalString,
  PLAID_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PLAID_PRODUCTS: z
    .string()
    .default("transactions")
    .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean)),
  PLAID_COUNTRY_CODES: z
    .string()
    .default("US")
    .transform((value) => value.split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean))
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  CLERK_PUBLISHABLE_KEY: parsedEnv.CLERK_PUBLISHABLE_KEY ?? parsedEnv.VITE_CLERK_PUBLISHABLE_KEY
};
