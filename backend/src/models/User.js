import mongoose from "mongoose";

export const ROLES = ["MEMBRE", "ADMIN"];

// Collection "utilisateurs" : même structure que le validateur du script Mongo.
// Le rôle matérialise l'héritage Utilisateur -> Membre / Administrateur du diagramme de classes.
const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 60 },
    prenom: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    motDePasseHash: { type: String, required: true, select: false },
    telephone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "MEMBRE", required: true },
    actif: { type: Boolean, default: true, required: true },
  },
  {
    collection: "utilisateurs",
    versionKey: false,
    timestamps: { createdAt: "dateCreation", updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.motDePasseHash;
        return ret;
      },
    },
  }
);

export const User = mongoose.model("Utilisateur", userSchema);