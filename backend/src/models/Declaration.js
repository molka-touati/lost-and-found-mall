import mongoose from "mongoose";

export const TYPES = ["PERDU", "TROUVE"];
export const STATUTS = ["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"];

const { ObjectId } = mongoose.Schema.Types;

// Collection "declarations" : mêmes champs que le validateur du script Mongo,
// plus deux champs optionnels : dateEvenement (diagramme de classes) et detailsPrives.
const declarationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true },
    titre: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    dateEvenement: { type: Date },
    photoUrl: { type: String, trim: true },
    // Information PRIVÉE (ex. signe distinctif, numéro de série) : sert à vérifier le
    // propriétaire. Visible uniquement par l'auteur et les administrateurs.
    detailsPrives: { type: String, trim: true, maxlength: 500 },
    statut: { type: String, enum: STATUTS, default: "PUBLIEE", required: true },
    auteurId: { type: ObjectId, ref: "Utilisateur", required: true },
    categorieId: { type: ObjectId, ref: "Categorie", required: true },
    zoneId: { type: ObjectId, ref: "Zone", required: true },
  },
  {
    collection: "declarations",
    versionKey: false,
    timestamps: { createdAt: "dateCreation", updatedAt: "dateModification" },
  }
);

declarationSchema.index({ auteurId: 1, dateCreation: -1 }, { name: "idx_auteur" });
// Même définition que dans le script Mongo (recherche plein texte en français).
declarationSchema.index(
  { titre: "text", description: "text" },
  { default_language: "french", weights: { titre: 3, description: 1 }, name: "idx_texte" }
);

export const Declaration = mongoose.model("Declaration", declarationSchema);