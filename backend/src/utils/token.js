import jwt from "jsonwebtoken";
import { env, isProd } from "../config/env.js";

export const COOKIE_NAME = "lf_token";

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// Le JWT est stocké dans un cookie httpOnly : JavaScript côté navigateur ne peut pas le lire,
// ce qui protège le jeton contre le vol par XSS.
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
}

export function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}