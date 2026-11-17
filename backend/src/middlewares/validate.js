import { ApiError } from "../utils/ApiError.js";

// validate({ body, query, params }) : valide avec Zod et dépose le résultat nettoyé
// dans req.valid. On ne modifie pas req.query (en lecture seule avec Express 5).
export const validate = (schemas) => (req, _res, next) => {
  const valid = {};
  const errors = [];
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) valid[part] = result.data;
    else
      for (const i of result.error.issues)
        errors.push({ champ: [part === "body" ? "" : part, ...i.path].filter(Boolean).join("."), message: i.message });
  }
  if (errors.length) return next(ApiError.badRequest("Données invalides", errors));
  req.valid = valid;
  next();
};