import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.js";
import { idParams } from "../validators/common.js";
import {
  changeStatusSchema, createDeclarationSchema, listQuerySchema, updateDeclarationSchema,
} from "../validators/declaration.validator.js";
import * as c from "../controllers/declaration.controller.js";

const r = Router();
r.use(protect);
r.get("/", validate({ query: listQuerySchema }), c.list);
r.post("/", validate({ body: createDeclarationSchema }), c.create);
r.get("/mine", validate({ query: listQuerySchema }), c.listMine); // avant "/:id"
r.get("/:id", validate({ params: idParams }), c.getOne);
r.patch("/:id", validate({ params: idParams, body: updateDeclarationSchema }), c.update);
r.patch("/:id/statut", validate({ params: idParams, body: changeStatusSchema }), c.changeStatus);
r.delete("/:id", validate({ params: idParams }), c.remove);
export default r;