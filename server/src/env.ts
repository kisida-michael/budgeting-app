import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@127.0.0.1:54329/jsheehan_budget"),
  AUTH_SECRET: z.string().min(12).default("local-development-auth-secret")
});

export const env = envSchema.parse(process.env);
