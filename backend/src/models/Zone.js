import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    emplacement: { type: String, trim: true },
  },
  {
    collection: "zones",
    versionKey: false,
    toJSON: { transform(_d, r) { r.id = String(r._id); delete r._id; return r; } },
  }
);

export const Zone = mongoose.model("Zone", schema);