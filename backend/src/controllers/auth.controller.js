import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { setAuthCookie, clearAuthCookie } from "../utils/token.js";

const BCRYPT_COST = 12;
// Hash factice : on compare toujours un mot de passe, même si l'email n'existe pas,
// pour que le temps de réponse ne révèle pas quels emails ont un compte.
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-factice-1", BCRYPT_COST);

export async function register(req, res) {
  const { nom, prenom, email, motDePasse, telephone } = req.valid.body;
  if (await User.exists({ email })) throw ApiError.conflict("Un compte existe déjà avec cet email");

  const user = await User.create({
    nom,
    prenom,
    email,
    telephone: telephone || undefined,
    motDePasseHash: await bcrypt.hash(motDePasse, BCRYPT_COST),
    role: "MEMBRE", // jamais choisi par le client
    actif: true,
  });
  setAuthCookie(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { email, motDePasse } = req.valid.body;
  const user = await User.findOne({ email }).select("+motDePasseHash");
  const ok = await bcrypt.compare(motDePasse, user?.motDePasseHash ?? DUMMY_HASH);
  // Même message pour "email inconnu" et "mauvais mot de passe".
  if (!user || !ok) throw ApiError.unauthorized("Email ou mot de passe incorrect");
  if (!user.actif) throw ApiError.forbidden("Ce compte est désactivé");
  setAuthCookie(res, user);
  res.json({ user });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: "Déconnecté" });
}

export function me(req, res) {
  res.json({ user: req.user });
}