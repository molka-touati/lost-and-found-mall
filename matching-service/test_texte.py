from sentence_transformers import SentenceTransformer, util

# Le modèle qui comprend le français (il se télécharge au premier lancement)
modele = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

phrase1 = "Sac à dos noir perdu lundi dans la bibliothèque"
phrase2 = "Sac noir trouvé mardi près de la bibliothèque"
phrase3 = "Téléphone Samsung bleu oublié au cinéma"

v1 = modele.encode(phrase1)
v2 = modele.encode(phrase2)
v3 = modele.encode(phrase3)

print("Sac perdu / Sac trouvé  :", util.cos_sim(v1, v2).item())
print("Sac perdu / Téléphone   :", util.cos_sim(v1, v3).item())