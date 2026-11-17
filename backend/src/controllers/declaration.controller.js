import { Declaration } from "../models/Declaration.js";
import { Category } from "../models/Category.js";
import { Zone } from "../models/Zone.js";
import { ApiError } from "../utils/ApiError.js";
import { assertCanChangeStatus, isAdmin, isOwner, serialize } from "../services/declaration.rules.js";

const POPULATE = [
  { path: "auteurId", select: "nom prenom" },
  { path: "categorieId", select: "nom" },
  { path: "zoneId", select: "nom emplacement" },
];

async function assertRefsExist({ categorieId, zoneId }) {
  if (categorieId && !(await Category.exists({ _id: categorieId }))) throw ApiError.badRequest("Catégorie inconnue");
  if (zoneId && !(await Zone.exists({ _id: zoneId }))) throw ApiError.badRequest("Zone inconnue");
}

// Charge une déclaration ; une déclaration SUPPRIMEE est invisible (404) sauf pour son auteur et les admins.
async function loadVisible(id, user) {
  const decl = await Declaration.findById(id).populate(POPULATE);
  if (!decl || (decl.statut === "SUPPRIMEE" && !isOwner(decl, user) && !isAdmin(user)))
    throw ApiError.notFound("Déclaration introuvable");
  return decl;
}

async function paginate(filter, { page, limit }, user) {
  const [items, total] = await Promise.all([
    Declaration.find(filter)
      .sort({ dateCreation: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Declaration.countDocuments(filter),
  ]);
  return {
    data: items.map((d) => serialize(d, user)),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function create(req, res) {
  const body = req.valid.body;
  await assertRefsExist(body);
  const decl = await Declaration.create({
    ...body,
    photoUrl: body.photoUrl || undefined,
    detailsPrives: body.detailsPrives || undefined,
    dateEvenement: body.dateEvenement ?? new Date(),
    auteurId: req.user._id, // toujours l'utilisateur connecté, jamais le corps de la requête
    statut: "PUBLIEE",
  });
  await decl.populate(POPULATE);
  res.status(201).json({ declaration: serialize(decl, req.user) });
}

// Liste publique pour les membres connectés : seules les déclarations PUBLIEE / EN_COURS
// sont visibles ; le filtre "statut" est réservé aux admins.
export async function list(req, res) {
  const { type, statut, categorieId, zoneId, q, page, limit } = req.valid.query;
  if (statut && !isAdmin(req.user)) throw ApiError.forbidden("Filtre par statut réservé aux administrateurs");
  const filter = { statut: statut ?? { $in: ["PUBLIEE", "EN_COURS"] } };
  if (type) filter.type = type;
  if (categorieId) filter.categorieId = categorieId;
  if (zoneId) filter.zoneId = zoneId;
  if (q) filter.$text = { $search: q };
  res.json(await paginate(filter, { page, limit }, req.user));
}

export async function listMine(req, res) {
  const { type, statut, page, limit } = req.valid.query;
  const filter = { auteurId: req.user._id, statut: statut ?? { $ne: "SUPPRIMEE" } };
  if (type) filter.type = type;
  res.json(await paginate(filter, { page, limit }, req.user));
}

export async function getOne(req, res) {
  const decl = await loadVisible(req.valid.params.id, req.user);
  res.json({ declaration: serialize(decl, req.user) });
}

// Modification : réservée à l'auteur, tant que la déclaration est PUBLIEE.
// Une fois EN_COURS ou RESTITUEE, le contenu est figé pour ne pas fausser une correspondance.
export async function update(req, res) {
  const decl = await loadVisible(req.valid.params.id, req.user);
  if (!isOwner(decl, req.user)) throw ApiError.forbidden("Seul l'auteur peut modifier sa déclaration");
  if (decl.statut !== "PUBLIEE")
    throw ApiError.conflict("Modification impossible : la déclaration n'est plus au statut PUBLIEE");

  const body = req.valid.body;
  await assertRefsExist(body);
  for (const [key, value] of Object.entries(body)) {
    if (key === "photoUrl" || key === "detailsPrives") decl.set(key, value || undefined); // '' = effacer
    else decl.set(key, value);
  }
  await decl.save();
  await decl.populate(POPULATE);
  res.json({ declaration: serialize(decl, req.user) });
}

export async function changeStatus(req, res) {
  const decl = await loadVisible(req.valid.params.id, req.user);
  const { statut } = req.valid.body;
  assertCanChangeStatus(decl, req.user, statut);
  decl.statut = statut;
  await decl.save();
  res.json({ declaration: serialize(decl, req.user) });
}

// Suppression logique (statut SUPPRIMEE) : l'historique reste disponible pour les admins.
export async function remove(req, res) {
  const decl = await loadVisible(req.valid.params.id, req.user);
  if (!isOwner(decl, req.user) && !isAdmin(req.user)) throw ApiError.forbidden("Suppression non autorisée");
  if (decl.statut === "SUPPRIMEE") throw ApiError.notFound("Déclaration introuvable");
  decl.statut = "SUPPRIMEE";
  await decl.save();
  res.json({ message: "Déclaration supprimée" });
}