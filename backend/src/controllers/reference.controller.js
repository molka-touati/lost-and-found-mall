import { Category } from "../models/Category.js";
import { Zone } from "../models/Zone.js";

export async function listCategories(_req, res) {
  res.json({ data: await Category.find().sort({ nom: 1 }) });
}
export async function listZones(_req, res) {
  res.json({ data: await Zone.find().sort({ nom: 1 }) });
}