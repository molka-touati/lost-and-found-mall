import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.js";
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from "../validators/auth.validator.js";
import * as c from "../controllers/user.controller.js";

const r = Router();
r.use(protect);
r.patch("/me", validate({ body: updateProfileSchema }), c.updateProfile);
r.patch("/me/password", validate({ body: changePasswordSchema }), c.changePassword);
r.delete("/me", validate({ body: deleteAccountSchema }), c.deleteAccount);
export default r;