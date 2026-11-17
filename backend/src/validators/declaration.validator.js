import { z } from "zod";
import { TYPES, STATUTS } from "../models/Declaration.js";
import { objectId, httpUrl } from "./common.js";

// L'événement (perte ou découverte) ne peut pas être dans le futur (+1 jour de tolérance fuseau).
const dateEvenement = z.coerce.date({ error: "Date invalide" }).refine(
  (d) => d.getTime() <= Date.now() + 24 * 3600 * 1000,
  "La date ne peut pas être dans le futur"
);

const titre = z.string({ error: "Titre obligatoire" }).trim().min(3, "Titre : 3 caractères minimum").max(120);
const description = z
  .string({ error: "Description obligatoire" })
  .trim()
  .min(10, "Description : 10 caractères minimum")
  .max(2000);

// '' est accepté pour permettre d'effacer un champ optionnel.
const photoUrl = z.union([httpUrl, z.literal("")]);
const detailsPrives = z.string().trim().max(500);

export const createDeclarationSchema = z.object({
  type: z.enum(TYPES, { error: "Type invalide (PERDU ou TROUVE)" }),
  titre,
  description,
  categorieId: objectId,
  zoneId: objectId,
  dateEvenement: dateEvenement.optional(),
  photoUrl: photoUrl.optional(),
  detailsPrives: detailsPrives.optional(),
}).strict();

// Le type (PERDU/TROUVE) et le statut ne sont pas modifiables ici.
export const updateDeclarationSchema = z.object({
  titre: titre.optional(),
  description: description.optional(),
  categorieId: objectId.optional(),
  zoneId: objectId.optional(),
  dateEvenement: dateEvenement.optional(),
  photoUrl: photoUrl.optional(),
  detailsPrives: detailsPrives.optional(),
}).strict().refine((o) => Object.keys(o).length > 0, "Aucune modification fournie");

export const changeStatusSchema = z.object({
  statut: z.enum(STATUTS, { error: "Statut invalide" }),
}).strict();

export const listQuerySchema = z.object({
  type: z.enum(TYPES).optional(),
  statut: z.enum(STATUTS).optional(),
  categorieId: objectId.optional(),
  zoneId: objectId.optional(),
  q: z.string().trim().min(2).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});