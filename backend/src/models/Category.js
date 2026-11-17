import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
  },
  {
    collection: "categories",
    versionKey: false,
    toJSON: { transform(_d, r) { r.id = String(r._id); delete r._id; return r; } },
  }
);

export const Category = mongoose.model("Categorie", schema);