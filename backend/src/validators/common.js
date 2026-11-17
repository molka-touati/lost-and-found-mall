import { z } from "zod";

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return ["http:", "https:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, "URL invalide (http ou https uniquement)");

export const idParams = z.object({ id: objectId });