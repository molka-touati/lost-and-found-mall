import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

try {
  await connectDB();
  app.listen(env.PORT, () => console.log(`API prête sur http://localhost:${env.PORT}`));
} catch (err) {
  console.error("Démarrage impossible :", err.message);
  process.exit(1);
}