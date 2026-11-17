// Crée ou met à jour un compte avec un VRAI mot de passe hashé (bcrypt).
// Utile pour créer le premier administrateur, ou pour activer les comptes de démo du seed
// (dont les hash sont factices).
//   npm run create-user -- admin@lostfound.tn MotDePasse123 ADMIN Ben-Ali Karim
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { User } from "../src/models/User.js";

const [email, password, role = "MEMBRE", nom = "Utilisateur", prenom = "Test"] = process.argv.slice(2);
if (!email || !password || password.length < 8 || !["MEMBRE", "ADMIN"].includes(role)) {
  console.error("Usage : npm run create-user -- <email> <motdepasse(8+)> [MEMBRE|ADMIN] [nom] [prenom]");
  process.exit(1);
}

await mongoose.connect(env.MONGO_URI);
const hash = await bcrypt.hash(password, 12);
const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { $set: { motDePasseHash: hash, role, actif: true }, $setOnInsert: { nom, prenom, dateCreation: new Date() } },
  { upsert: true, new: true }
);
console.log(`OK : ${user.email} (${user.role})`);
await mongoose.disconnect();