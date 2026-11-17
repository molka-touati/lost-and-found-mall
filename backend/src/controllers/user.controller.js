import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Declaration } from "../models/Declaration.js";
import { ApiError } from "../utils/ApiError.js";
import { clearAuthCookie } from "../utils/token.js";

export async function updateProfile(req, res) {
  const { nom, prenom, telephone } = req.valid.body;
  const user = req.user;
  if (nom !== undefined) user.nom = nom;
  if (prenom !== undefined) user.prenom = prenom;
  if (telephone !== undefined) user.telephone = telephone || undefined; // '' efface le numéro
  await user.save();
  res.json({ user });
}

export async function changePassword(req, res) {
  const { motDePasseActuel, nouveauMotDePasse } = req.valid.body;
  const user = await User.findById(req.user._id).select("+motDePasseHash");
  if (!(await bcrypt.compare(motDePasseActuel, user.motDePasseHash)))
    throw ApiError.unauthorized("Mot de passe actuel incorrect");
  user.motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 12);
  await user.save();
  res.json({ message: "Mot de passe modifié" });
}

// Suppression de compte = désactivation (suppression logique).
// Les déclarations ouvertes sont retirées de la vue publique (SUPPRIMEE) ; celles déjà
// RESTITUEE sont conservées comme historique. Rien n'est effacé physiquement.
export async function deleteAccount(req, res) {
  const user = await User.findById(req.user._id).select("+motDePasseHash");
  if (!(await bcrypt.compare(req.valid.body.motDePasse, user.motDePasseHash)))
    throw ApiError.unauthorized("Mot de passe incorrect");

  if (user.role === "ADMIN" && (await User.countDocuments({ role: "ADMIN", actif: true })) <= 1)
    throw ApiError.conflict("Impossible de supprimer le dernier administrateur actif");

  user.actif = false;
  await user.save();
  await Declaration.updateMany(
    { auteurId: user._id, statut: { $in: ["PUBLIEE", "EN_COURS"] } },
    { $set: { statut: "SUPPRIMEE" } }
  );
  clearAuthCookie(res);
  res.json({ message: "Compte désactivé" });
}