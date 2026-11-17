import "dotenv/config";
import { z } from "zod";

// Validation des variables d'environnement au démarrage : on échoue tout de suite
// avec un message clair plutôt que de planter plus tard.
const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI est obligatoire"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit contenir au moins 16 caractères"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Configuration invalide (.env) :");
  for (const i of parsed.error.issues) console.error(` - ${i.path.join(".")} : ${i.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";