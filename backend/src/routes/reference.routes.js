import { Router } from "express";
import * as c from "../controllers/reference.controller.js";

// Listes de référence en lecture seule (la gestion admin des catégories / zones est à part).
const r = Router();
r.get("/categories", c.listCategories);
r.get("/zones", c.listZones);
export default r;