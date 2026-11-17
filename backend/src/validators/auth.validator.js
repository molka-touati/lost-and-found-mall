import { z } from "zod";

const nomPropre = (label) =>
  z.string({ error: `${label} obligatoire` }).trim().min(2, `${label} : 2 caractères minimum`).max(60);

// bcrypt ignore tout ce qui dépasse 72 octets : on plafonne donc à 72.
const motDePasse = z
  .string({ error: "Mot de passe obligatoire" })
  .min(8, "Mot de passe : 8 caractères minimum")
  .max(72, "Mot de passe : 72 caractères maximum")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

const telephone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .refine((v) => v === "" || /^\+?[0-9]{8,15}$/.test(v), "Numéro de téléphone invalide");

const email = z.string({ error: "Email obligatoire" }).trim().toLowerCase().email("Email invalide").max(120);

// .strict() : toute clé inconnue (ex. "role": "ADMIN") est refusée.
export const registerSchema = z.object({
  nom: nomPropre("Nom"),
  prenom: nomPropre("Prénom"),
  email,
  motDePasse,
  telephone: telephone.optional(),
}).strict();

export const loginSchema = z.object({
  email,
  motDePasse: z.string({ error: "Mot de passe obligatoire" }).min(1, "Mot de passe obligatoire").max(72),
}).strict();

export const updateProfileSchema = z.object({
  nom: nomPropre("Nom").optional(),
  prenom: nomPropre("Prénom").optional(),
  telephone: telephone.optional(),
}).strict().refine((o) => Object.keys(o).length > 0, "Aucune modification fournie");

export const changePasswordSchema = z.object({
  motDePasseActuel: z.string().min(1, "Mot de passe actuel obligatoire").max(72),
  nouveauMotDePasse: motDePasse,
}).strict();

export const deleteAccountSchema = z.object({
  motDePasse: z.string().min(1, "Mot de passe obligatoire").max(72),
}).strict();