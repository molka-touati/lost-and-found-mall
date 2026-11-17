import { ApiError } from "../utils/ApiError.js";
import { isProd } from "../config/env.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message;
  let details = err.details;

  if (err.code === 11000) {
    status = 409;
    message = "Cette valeur existe déjà (ex. email déjà utilisé)";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = "Données invalides";
    details = Object.values(err.errors).map((e) => ({ champ: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    status = 400;
    message = "Identifiant invalide";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "JSON invalide";
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = "Erreur interne du serveur";
  }
  res.status(status).json({ message, ...(details ? { details } : {}) });
}