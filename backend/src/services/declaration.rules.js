import { ApiError } from "../utils/ApiError.js";

// Règles métier des déclarations, regroupées au même endroit.
//
// Cycle de vie :
//   PUBLIEE  <-> EN_COURS  (une correspondance est en discussion)
//   PUBLIEE / EN_COURS -> RESTITUEE  (objet retrouvé et rendu : état final)
//   SUPPRIMEE : uniquement via DELETE ; seul un ADMIN peut ensuite remettre en PUBLIEE.
// Qui peut changer le statut : l'auteur (transitions ci-dessous) et l'administrateur (toutes).
const TRANSITIONS = {
  PUBLIEE: { EN_COURS: ["MEMBRE", "ADMIN"], RESTITUEE: ["MEMBRE", "ADMIN"] },
  EN_COURS: { PUBLIEE: ["MEMBRE", "ADMIN"], RESTITUEE: ["MEMBRE", "ADMIN"] },
  RESTITUEE: { PUBLIEE: ["ADMIN"] },
  SUPPRIMEE: { PUBLIEE: ["ADMIN"] },
};

export const isAdmin = (user) => user.role === "ADMIN";
export const isOwner = (decl, user) => String(decl.auteurId?._id ?? decl.auteurId) === String(user._id);

export function assertCanChangeStatus(decl, user, nouveau) {
  if (!isOwner(decl, user) && !isAdmin(user)) throw ApiError.forbidden("Vous n'êtes pas l'auteur de cette déclaration");
  if (decl.statut === nouveau) throw ApiError.badRequest("La déclaration a déjà ce statut");
  const allowedRoles = TRANSITIONS[decl.statut]?.[nouveau];
  if (!allowedRoles) throw ApiError.conflict(`Transition interdite : ${decl.statut} -> ${nouveau}`);
  if (!allowedRoles.includes(user.role)) throw ApiError.forbidden("Seul un administrateur peut effectuer cette transition");
}

// Vue renvoyée au client : les champs privés ne sortent que pour l'auteur et les admins,
// et le nom de famille de l'auteur est réduit à son initiale pour les autres membres.
export function serialize(doc, viewer) {
  const o = doc.toObject();
  const privileged = isOwner(o, viewer) || isAdmin(viewer);
  const a = o.auteurId && o.auteurId.prenom ? o.auteurId : null;
  const c = o.categorieId && o.categorieId.nom ? o.categorieId : null;
  const z = o.zoneId && o.zoneId.nom ? o.zoneId : null;

  return {
    id: String(o._id),
    type: o.type,
    titre: o.titre,
    description: o.description,
    statut: o.statut,
    dateEvenement: o.dateEvenement ?? null,
    photoUrl: o.photoUrl ?? null,
    dateCreation: o.dateCreation,
    dateModification: o.dateModification,
    estAuteur: isOwner(o, viewer),
    categorie: c ? { id: String(c._id), nom: c.nom } : { id: String(o.categorieId) },
    zone: z ? { id: String(z._id), nom: z.nom, emplacement: z.emplacement ?? null } : { id: String(o.zoneId) },
    auteur: a ? { prenom: a.prenom, nom: privileged ? a.nom : `${a.nom.charAt(0)}.` } : null,
    ...(privileged ? { detailsPrives: o.detailsPrives ?? null } : {}),
  };
}