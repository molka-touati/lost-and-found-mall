import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import * as c from "../controllers/auth.controller.js";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Trop de tentatives, réessayez dans quelques minutes" },
});

const r = Router();
r.post("/register", limiter, validate({ body: registerSchema }), c.register);
r.post("/login", limiter, validate({ body: loginSchema }), c.login);
r.post("/logout", c.logout);
r.get("/me", protect, c.me);
export default r;