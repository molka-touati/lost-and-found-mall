import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { COOKIE_NAME } from "../utils/token.js";

// Vérifie le cookie JWT puis recharge l'utilisateur en base : un compte désactivé
// ou un rôle modifié est pris en compte immédiatement, sans attendre l'expiration du jeton.
export async function protect(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized("Session expirée, reconnectez-vous");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.actif) throw ApiError.unauthorized("Compte introuvable ou désactivé");
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw ApiError.forbidden("Droits insuffisants");
  next();
};