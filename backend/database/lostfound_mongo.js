/* =====================================================================
   PARTIE 0 : CONNEXION ET REMISE À ZÉRO
   ===================================================================== */

// Nom de la base. MongoDB la crée automatiquement à la 1re écriture.
const lf = db.getSiblingDB("lostfound");

// true  = supprime les collections existantes puis recrée tout
// false = ne touche pas aux collections déjà présentes
const RESET = true;

const COLLECTIONS = [
  "utilisateurs", "declarations", "categories", "zones",
  "correspondances", "analyses_matching", "conversations",
  "messages", "signalements", "notifications"
];

if (RESET) {
  COLLECTIONS.forEach(function (nom) { lf.getCollection(nom).drop(); });
  print("Collections existantes supprimées.");
}


/* =====================================================================
   PARTIE 1 : CRÉATION DES COLLECTIONS AVEC VALIDATION
   ---------------------------------------------------------------------
   - validator        : règles que chaque document doit respecter
   - validationLevel  : "strict" = valable pour insertions ET mises à jour
   - validationAction : "error"  = refuse le document invalide
   Les validateurs sont une 2e barrière : la 1re reste Zod côté Node.js.
   ===================================================================== */

// ---- 1.1 utilisateurs (Utilisateur / Membre / Administrateur) --------
lf.createCollection("utilisateurs", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["nom", "prenom", "email", "motDePasseHash", "role", "actif", "dateCreation"],
    properties: {
      nom:            { bsonType: "string", minLength: 1 },
      prenom:         { bsonType: "string", minLength: 1 },
      email:          { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
      motDePasseHash: { bsonType: "string" },          // jamais le mot de passe en clair
      telephone:      { bsonType: "string" },
      actif:          { bsonType: "bool" },
      dateCreation:   { bsonType: "date" },
      // Champ ajouté pour représenter l'héritage Membre / Administrateur
      role:           { enum: ["MEMBRE", "ADMIN"] }
    }
  }},
  validationLevel: "strict",
  validationAction: "error"
});

// ---- 1.2 categories -------------------------------------------------
lf.createCollection("categories", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["nom"],
    properties: {
      nom:         { bsonType: "string", minLength: 1 },
      description: { bsonType: "string" }
    }
  }}
});

// ---- 1.3 zones ------------------------------------------------------
lf.createCollection("zones", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["nom"],
    properties: {
      nom:         { bsonType: "string", minLength: 1 },
      description: { bsonType: "string" },
      emplacement: { bsonType: "string" }              // ex : "Niveau 1, près de l'entrée"
    }
  }}
});

// ---- 1.4 declarations -----------------------------------------------
// Relations : auteurId (Membre "crée" Declaration),
//             categorieId (appartient à), zoneId (concerne)
lf.createCollection("declarations", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["type", "titre", "description", "statut", "auteurId",
               "categorieId", "zoneId", "dateCreation"],
    properties: {
      type:             { enum: ["PERDU", "TROUVE"] },                       // TypeDeclaration
      titre:            { bsonType: "string", minLength: 3, maxLength: 120 },
      description:      { bsonType: "string", minLength: 5 },
      dateCreation:     { bsonType: "date" },
      photoUrl:         { bsonType: "string" },                               // optionnel
      statut:           { enum: ["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"] }, // StatutDeclaration
      dateModification: { bsonType: "date" },
      auteurId:         { bsonType: "objectId" },
      categorieId:      { bsonType: "objectId" },
      zoneId:           { bsonType: "objectId" }
    }
  }}
});

// ---- 1.5 analyses_matching ------------------------------------------
// Scores entre 0 et 1 ; pondérations possibles 40/30/15/10/5 (à adapter)
const score01 = { bsonType: "number", minimum: 0, maximum: 1 };
lf.createCollection("analyses_matching", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["scorePhoto", "scoreTexte", "scoreLieu", "scoreDate",
               "scoreCategorie", "dateAnalyse"],
    properties: {
      scorePhoto:     score01,
      scoreTexte:     score01,
      scoreLieu:      score01,
      scoreDate:      score01,
      scoreCategorie: score01,
      modeleImage:    { bsonType: "string" },          // ex : "resnet50"
      modeleTexte:    { bsonType: "string" },          // ex : "sentence-bert"
      dateAnalyse:    { bsonType: "date" }
    }
  }}
});

// ---- 1.6 correspondances --------------------------------------------
// Relations : declarationPerduId / declarationTrouveeId (vers declarations)
//             analyseId : "une analyse propose 0..* correspondances,
//                          une correspondance vient d'UNE seule analyse"
lf.createCollection("correspondances", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["declarationPerdueId", "declarationTrouveeId", "analyseId",
               "scoreGlobal", "statut", "dateCreation"],
    properties: {
      declarationPerdueId:  { bsonType: "objectId" },
      declarationTrouveeId: { bsonType: "objectId" },
      analyseId:            { bsonType: "objectId" },
      scoreGlobal:          score01,
      statut:               { enum: ["PROPOSEE", "A_VERIFIER", "ACCEPTEE", "REFUSEE"] }, // StatutCorrespondance
      dateCreation:         { bsonType: "date" },
      dateMiseAJour:        { bsonType: "date" }
    }
  }}
});

// ---- 1.7 conversations ----------------------------------------------
// Composition Correspondance 1 -> 0..1 Conversation : correspondanceId unique
lf.createCollection("conversations", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["correspondanceId", "dateConversation", "active"],
    properties: {
      correspondanceId: { bsonType: "objectId" },
      dateConversation: { bsonType: "date" },
      active:           { bsonType: "bool" }          // à vérifier avec l'autre groupe
    }
  }}
});

// ---- 1.8 messages ---------------------------------------------------
// Relations : conversationId (Conversation contient 0..* Message),
//             expediteurId (Membre expéditeur)
lf.createCollection("messages", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["conversationId", "expediteurId", "contenu", "dateEnvoi", "lu"],
    properties: {
      conversationId: { bsonType: "objectId" },
      expediteurId:   { bsonType: "objectId" },
      contenu:        { bsonType: "string", minLength: 1, maxLength: 2000 },
      dateEnvoi:      { bsonType: "date" },
      lu:             { bsonType: "bool" }
    }
  }}
});

// ---- 1.9 signalements -----------------------------------------------
// Relations : declarationId (cible), membreId (dépose),
//             adminId (effectue : renseigné quand l'admin le traite)
lf.createCollection("signalements", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["declarationId", "membreId", "motif", "description", "dateCreation"],
    properties: {
      declarationId: { bsonType: "objectId" },
      membreId:      { bsonType: "objectId" },
      adminId:       { bsonType: ["objectId", "null"] },   // null tant que non traité
      motif:         { enum: ["FAUSSE_DECLARATION", "CONTENU_INAPPROPRIE",
                              "DOUBLON", "INFORMATION_INCORRECTE", "AUTRE"] }, // MotifSignalement
      description:   { bsonType: "string" },
      dateCreation:  { bsonType: "date" },
      dateTraitement:{ bsonType: ["date", "null"] }
    }
  }}
});

// ---- 1.10 notifications ---------------------------------------------
lf.createCollection("notifications", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["utilisateurId", "titre", "message", "type", "dateCreation", "lue"],
    properties: {
      utilisateurId: { bsonType: "objectId" },            // destinataire
      titre:         { bsonType: "string" },
      message:       { bsonType: "string" },
      type:          { enum: ["NOUVELLE_CORRESPONDANCE", "CORRESPONDANCE_ACCEPTEE",
                              "CORRESPONDANCE_REFUSEE", "NOUVEAU_MESSAGE",
                              "STATUT_MODIFIE", "SIGNALEMENT_TRAITE",
                              "OBJET_RESTITUE"] },        // TypeNotification
      dateCreation:  { bsonType: "date" },
      lue:           { bsonType: "bool" },
      dateLecture:   { bsonType: ["date", "null"] }
    }
  }}
});

print("Partie 1 : 10 collections créées.");


/* =====================================================================
   PARTIE 2 : INDEX
   Un index accélère les recherches sur un champ (important avec 10 000+
   déclarations). unique:true interdit les doublons.
   ===================================================================== */

// Un email = un compte
lf.utilisateurs.createIndex({ email: 1 }, { unique: true });

// Noms uniques pour éviter les doublons de zones / catégories
lf.categories.createIndex({ nom: 1 }, { unique: true });
lf.zones.createIndex({ nom: 1 }, { unique: true });

// Recherche texte (titre + description) en français ; le titre pèse plus
lf.declarations.createIndex(
  { titre: "text", description: "text" },
  { default_language: "french", weights: { titre: 3, description: 1 }, name: "idx_texte" }
);
// Recherche combinée : type + statut + zone + catégorie + tri par date
lf.declarations.createIndex(
  { type: 1, statut: 1, zoneId: 1, categorieId: 1, dateCreation: -1 },
  { name: "idx_recherche" }
);
// "Mes déclarations"
lf.declarations.createIndex({ auteurId: 1, dateCreation: -1 }, { name: "idx_auteur" });

// Une paire (perdu, trouvé) ne peut être proposée qu'une seule fois
lf.correspondances.createIndex(
  { declarationPerdueId: 1, declarationTrouveeId: 1 },
  { unique: true, name: "idx_paire_unique" }
);
lf.correspondances.createIndex({ declarationPerdueId: 1 });
lf.correspondances.createIndex({ declarationTrouveeId: 1 });
lf.correspondances.createIndex({ analyseId: 1 });
lf.correspondances.createIndex({ statut: 1, scoreGlobal: -1 });

// 0..1 conversation par correspondance
lf.conversations.createIndex({ correspondanceId: 1 }, { unique: true });

// Messages d'une conversation dans l'ordre chronologique
lf.messages.createIndex({ conversationId: 1, dateEnvoi: 1 });

// Signalements
lf.signalements.createIndex({ declarationId: 1 });
lf.signalements.createIndex({ membreId: 1 });
lf.signalements.createIndex({ adminId: 1 });
lf.signalements.createIndex({ dateTraitement: 1 });   // trouver les non traités

// Notifications d'un utilisateur : non lues d'abord, plus récentes en tête
lf.notifications.createIndex({ utilisateurId: 1, lue: 1, dateCreation: -1 });

print("Partie 2 : index créés.");


/* =====================================================================
   PARTIE 3 : DONNÉES DE DÉMONSTRATION (SEED)
   On fixe les _id à la main pour pouvoir relier les documents entre eux.
   Les mots de passe ci-dessous sont des FAUX hash : dans l'application,
   utilisez bcrypt.hash() côté Node.js.
   ===================================================================== */

const now = new Date();
const jours = function (n) { return new Date(now.getTime() - n * 24 * 3600 * 1000); };

// ---- Identifiants fixés ----
const idAdmin = new ObjectId(), idAmine = new ObjectId(), idSarra = new ObjectId();
const idCatSac = new ObjectId(), idCatTel = new ObjectId(), idCatCles = new ObjectId();
const idZoneFood = new ObjectId(), idZoneEntree = new ObjectId(), idZoneParking = new ObjectId();
const idDecPerdue = new ObjectId(), idDecTrouvee = new ObjectId(), idDecTel = new ObjectId();
const idAnalyse = new ObjectId(), idCorr = new ObjectId(), idConv = new ObjectId();

// ---- utilisateurs ----
lf.utilisateurs.insertMany([
  { _id: idAdmin, nom: "Ben Ali", prenom: "Karim", email: "admin@lostfound.tn",
    motDePasseHash: "$2b$10$FAUXHASHADMIN", telephone: "20111222", actif: true,
    dateCreation: jours(60), role: "ADMIN" },
  { _id: idAmine, nom: "Trabelsi", prenom: "Amine", email: "amine@mail.tn",
    motDePasseHash: "$2b$10$FAUXHASHAMINE", telephone: "22333444", actif: true,
    dateCreation: jours(30), role: "MEMBRE" },
  { _id: idSarra, nom: "Gharbi", prenom: "Sarra", email: "sarra@mail.tn",
    motDePasseHash: "$2b$10$FAUXHASHSARRA", telephone: "55666777", actif: true,
    dateCreation: jours(25), role: "MEMBRE" }
]);

// ---- categories et zones ----
lf.categories.insertMany([
  { _id: idCatSac,  nom: "Sacs",         description: "Sacs à dos, sacs à main, valises" },
  { _id: idCatTel,  nom: "Téléphones",   description: "Smartphones et accessoires" },
  { _id: idCatCles, nom: "Clés",         description: "Clés, porte-clés, badges" }
]);
lf.zones.insertMany([
  { _id: idZoneFood,    nom: "Food court",         description: "Espace restauration", emplacement: "Niveau 2" },
  { _id: idZoneEntree,  nom: "Entrée principale",  description: "Hall d'accueil",      emplacement: "Rez-de-chaussée" },
  { _id: idZoneParking, nom: "Parking",            description: "Parking souterrain",  emplacement: "Sous-sol" }
]);

// ---- declarations ----
lf.declarations.insertMany([
  { _id: idDecPerdue, type: "PERDU", titre: "Sac à dos noir perdu",
    description: "Sac à dos noir de marque Nike contenant un ordinateur portable, perdu lundi près du food court.",
    dateCreation: jours(3), photoUrl: "https://exemple.tn/photos/sac1.jpg",
    statut: "PUBLIEE", dateModification: jours(3),
    auteurId: idAmine, categorieId: idCatSac, zoneId: idZoneFood },
  { _id: idDecTrouvee, type: "TROUVE", titre: "Sac noir trouvé",
    description: "Sac à dos noir trouvé mardi sur une chaise du food court, contient un ordinateur.",
    dateCreation: jours(2), photoUrl: "https://exemple.tn/photos/sac2.jpg",
    statut: "PUBLIEE", dateModification: jours(2),
    auteurId: idSarra, categorieId: idCatSac, zoneId: idZoneFood },
  { _id: idDecTel, type: "PERDU", titre: "Téléphone Samsung perdu",
    description: "Samsung Galaxy bleu avec coque transparente perdu au parking.",
    dateCreation: jours(1), statut: "PUBLIEE", dateModification: jours(1),
    auteurId: idSarra, categorieId: idCatTel, zoneId: idZoneParking }
]);

// ---- analyses_matching + correspondances ----
// scoreGlobal = 0.40*photo + 0.30*texte + 0.15*lieu + 0.10*date + 0.05*categorie
lf.analyses_matching.insertOne({
  _id: idAnalyse, scorePhoto: 0.90, scoreTexte: 0.85, scoreLieu: 0.80,
  scoreDate: 0.90, scoreCategorie: 1.0,
  modeleImage: "resnet50", modeleTexte: "sentence-bert", dateAnalyse: jours(2)
});
lf.correspondances.insertOne({
  _id: idCorr, declarationPerdueId: idDecPerdue, declarationTrouveeId: idDecTrouvee,
  analyseId: idAnalyse, scoreGlobal: 0.875, statut: "PROPOSEE",
  dateCreation: jours(2), dateMiseAJour: jours(2)
});

// ---- conversation + messages ----
lf.conversations.insertOne({
  _id: idConv, correspondanceId: idCorr, dateConversation: jours(1), active: true
});
lf.messages.insertMany([
  { conversationId: idConv, expediteurId: idAmine,
    contenu: "Bonjour, je pense que c'est mon sac, il y a un autocollant bleu devant.",
    dateEnvoi: jours(1), lu: true },
  { conversationId: idConv, expediteurId: idSarra,
    contenu: "Oui, il y a bien un autocollant bleu. Où peut-on se retrouver ?",
    dateEnvoi: new Date(), lu: false }
]);

// ---- signalement (déposé par Sarra, pas encore traité) ----
lf.signalements.insertOne({
  declarationId: idDecPerdue, membreId: idSarra, adminId: null,
  motif: "INFORMATION_INCORRECTE", description: "La zone indiquée semble erronée.",
  dateCreation: jours(1), dateTraitement: null
});

// ---- notifications ----
lf.notifications.insertMany([
  { utilisateurId: idAmine, titre: "Nouvelle correspondance",
    message: "Une correspondance a été proposée pour votre sac noir.",
    type: "NOUVELLE_CORRESPONDANCE", dateCreation: jours(2), lue: false, dateLecture: null },
  { utilisateurId: idSarra, titre: "Nouvelle correspondance",
    message: "Votre sac trouvé correspond peut-être à une déclaration.",
    type: "NOUVELLE_CORRESPONDANCE", dateCreation: jours(2), lue: false, dateLecture: null }
]);

print("Partie 3 : données de démonstration insérées.");


/* =====================================================================
   PARTIE 4 : REQUÊTES PAR CLASSE
   Dans l'application Node.js, chaque requête devient un appel Mongoose
   équivalent (find, findOne, updateOne, aggregate...). Remplacez les
   _id fixés ci-dessus par ceux venant de la requête HTTP.
   ===================================================================== */

// ---------------------------------------------------------------------
// 4.1 CLASSE Utilisateur
// ---------------------------------------------------------------------

// sAuthentifier() : retrouver le compte actif par email.
// Le mot de passe est ensuite comparé avec bcrypt.compare() en Node.js.
printjson(lf.utilisateurs.findOne({ email: "amine@mail.tn", actif: true }));

// seDeconnecter() : aucune requête (le JWT est simplement supprimé côté client).

// consulterProfil() : on masque le hash du mot de passe (projection)
printjson(lf.utilisateurs.findOne({ _id: idAmine }, { motDePasseHash: 0 }));

// modifierProfil() : modification de champs autorisés uniquement
lf.utilisateurs.updateOne(
  { _id: idAmine },
  { $set: { telephone: "22999888" } }
);

// consulterNotifications() : non lues d'abord, plus récentes en tête
printjson(lf.notifications.find({ utilisateurId: idAmine })
  .sort({ lue: 1, dateCreation: -1 }).toArray());

// Création d'un compte (inscription) : le role est toujours MEMBRE ici
// lf.utilisateurs.insertOne({ nom, prenom, email, motDePasseHash, telephone,
//                             actif: true, dateCreation: new Date(), role: "MEMBRE" });

// ---------------------------------------------------------------------
// 4.2 CLASSE Notification
// ---------------------------------------------------------------------

// marquerCommeLue()
lf.notifications.updateMany(
  { utilisateurId: idAmine, lue: false, type: "NOUVELLE_CORRESPONDANCE" },
  { $set: { lue: true, dateLecture: new Date() } }
);

// Nombre de notifications non lues (pastille de l'interface)
print("Non lues Sarra : " + lf.notifications.countDocuments({ utilisateurId: idSarra, lue: false }));

// Créer une notification (appelé par le backend lors d'un événement)
lf.notifications.insertOne({
  utilisateurId: idAmine, titre: "Statut modifié",
  message: "Le statut de votre déclaration a changé.",
  type: "STATUT_MODIFIE", dateCreation: new Date(), lue: false, dateLecture: null
});

// ---------------------------------------------------------------------
// 4.3 CLASSE Membre / Declaration
// ---------------------------------------------------------------------

// declarerObjetPerdu() / declarerObjetTrouve() : seul "type" change
lf.declarations.insertOne({
  type: "TROUVE", titre: "Clés de voiture trouvées",
  description: "Trousseau de clés avec porte-clés rouge trouvé près de l'entrée.",
  dateCreation: new Date(), statut: "PUBLIEE", dateModification: new Date(),
  auteurId: idSarra, categorieId: idCatCles, zoneId: idZoneEntree
});

// modifierDeclaration() : seulement par son auteur (filtre sur auteurId)
lf.declarations.updateOne(
  { _id: idDecPerdue, auteurId: idAmine, statut: { $ne: "SUPPRIMEE" } },
  { $set: { description: "Sac à dos noir Nike avec autocollant bleu, ordinateur à l'intérieur.",
            dateModification: new Date() } }
);

// supprimerDeclaration() par le membre : suppression LOGIQUE
// (statut SUPPRIMEE) pour garder l'historique et les correspondances
lf.declarations.updateOne(
  { _id: idDecTel, auteurId: idSarra },
  { $set: { statut: "SUPPRIMEE", dateModification: new Date() } }
);

// consulterSesDeclarations() : avec pagination (page 1, 10 par page)
const page = 1, taille = 10;
printjson(lf.declarations.find({ auteurId: idSarra, statut: { $ne: "SUPPRIMEE" } })
  .sort({ dateCreation: -1 }).skip((page - 1) * taille).limit(taille).toArray());

// rechercherDeclaration() : recherche combinée
// Exemple : objet trouvé + "sac noir" + food court + 7 derniers jours
printjson(lf.declarations.find(
  {
    $text: { $search: "sac noir" },
    type: "TROUVE",
    statut: "PUBLIEE",
    zoneId: idZoneFood,
    categorieId: idCatSac,
    dateCreation: { $gte: jours(7) }
  },
  { score: { $meta: "textScore" } }                  // pertinence
).sort({ score: { $meta: "textScore" }, dateCreation: -1 }).limit(20).toArray());

// Détail d'une déclaration avec catégorie, zone et auteur ($lookup = jointure)
printjson(lf.declarations.aggregate([
  { $match: { _id: idDecPerdue } },
  { $lookup: { from: "categories",  localField: "categorieId", foreignField: "_id", as: "categorie" } },
  { $lookup: { from: "zones",       localField: "zoneId",      foreignField: "_id", as: "zone" } },
  { $lookup: { from: "utilisateurs", localField: "auteurId",   foreignField: "_id", as: "auteur" } },
  { $unwind: "$categorie" }, { $unwind: "$zone" }, { $unwind: "$auteur" },
  { $project: { titre: 1, description: 1, type: 1, statut: 1, dateCreation: 1,
                "categorie.nom": 1, "zone.nom": 1,
                "auteur.nom": 1, "auteur.prenom": 1 } }   // on masque email, hash...
]).toArray());

// ---------------------------------------------------------------------
// 4.4 CLASSE AnalyseMatching / Correspondance
// ---------------------------------------------------------------------

// calculerScore() : le calcul se fait en Node.js/Python ; on enregistre ensuite
// l'analyse puis la correspondance si scoreGlobal dépasse le seuil (ex. 0.70)
// const a = lf.analyses_matching.insertOne({ scorePhoto, scoreTexte, scoreLieu,
//           scoreDate, scoreCategorie, modeleImage, modeleTexte, dateAnalyse: new Date() });
// lf.correspondances.insertOne({ declarationPerdueId, declarationTrouveeId,
//           analyseId: a.insertedId, scoreGlobal, statut: "PROPOSEE",
//           dateCreation: new Date(), dateMiseAJour: new Date() });

// Correspondances possibles pour une déclaration, meilleur score d'abord
printjson(lf.correspondances.find({
  $or: [{ declarationPerdueId: idDecPerdue }, { declarationTrouveeId: idDecPerdue }],
  statut: { $in: ["PROPOSEE", "A_VERIFIER"] }
}).sort({ scoreGlobal: -1 }).toArray());

// Une analyse et toutes les correspondances qu'elle a proposées (1 -> 0..*)
printjson(lf.correspondances.find({ analyseId: idAnalyse }).toArray());

// accepter()
lf.correspondances.updateOne(
  { _id: idCorr, statut: { $in: ["PROPOSEE", "A_VERIFIER"] } },
  { $set: { statut: "ACCEPTEE", dateMiseAJour: new Date() } }
);
// + notifier l'autre utilisateur
lf.notifications.insertOne({
  utilisateurId: idSarra, titre: "Correspondance acceptée",
  message: "Le propriétaire a accepté la correspondance.",
  type: "CORRESPONDANCE_ACCEPTEE", dateCreation: new Date(), lue: false, dateLecture: null
});

// refuser()
// lf.correspondances.updateOne({ _id: idCorr },
//   { $set: { statut: "REFUSEE", dateMiseAJour: new Date() } });

// demanderVerification()
// lf.correspondances.updateOne({ _id: idCorr },
//   { $set: { statut: "A_VERIFIER", dateMiseAJour: new Date() } });

// Restitution (optionnel) : déclarations -> RESTITUEE + notification
// lf.declarations.updateMany(
//   { _id: { $in: [idDecPerdue, idDecTrouvee] } },
//   { $set: { statut: "RESTITUEE", dateModification: new Date() } });

// ---------------------------------------------------------------------
// 4.5 CLASSE Conversation / Message
// ---------------------------------------------------------------------

// ouvrir() : une seule conversation par correspondance (index unique)
// lf.conversations.insertOne({ correspondanceId: idCorr,
//                              dateConversation: new Date(), active: true });

// fermer()
// lf.conversations.updateOne({ _id: idConv }, { $set: { active: false } });

// envoyer() : uniquement si la conversation est active
if (lf.conversations.countDocuments({ _id: idConv, active: true }) === 1) {
  lf.messages.insertOne({
    conversationId: idConv, expediteurId: idAmine,
    contenu: "Rendez-vous demain à 10h à l'accueil ?",
    dateEnvoi: new Date(), lu: false
  });
}

// Historique d'une conversation, du plus ancien au plus récent
printjson(lf.messages.find({ conversationId: idConv }).sort({ dateEnvoi: 1 }).toArray());

// marquerCommeLu() : messages reçus (envoyés par l'autre personne)
lf.messages.updateMany(
  { conversationId: idConv, expediteurId: { $ne: idSarra }, lu: false },
  { $set: { lu: true } }
);

// ---------------------------------------------------------------------
// 4.6 CLASSE Signalement
// ---------------------------------------------------------------------

// soumettre() : un membre signale une déclaration
lf.signalements.insertOne({
  declarationId: idDecTrouvee, membreId: idAmine, adminId: null,
  motif: "DOUBLON", description: "Cette déclaration existe déjà.",
  dateCreation: new Date(), dateTraitement: null
});

// Signalements non traités (file de modération de l'admin)
printjson(lf.signalements.find({ dateTraitement: null }).sort({ dateCreation: 1 }).toArray());

// traiter() / traiterSignalement() par l'administrateur
const sig = lf.signalements.findOne({ dateTraitement: null });
lf.signalements.updateOne(
  { _id: sig._id },
  { $set: { adminId: idAdmin, dateTraitement: new Date() } }
);
// + notifier le membre qui avait signalé
lf.notifications.insertOne({
  utilisateurId: sig.membreId, titre: "Signalement traité",
  message: "Votre signalement a été pris en compte.",
  type: "SIGNALEMENT_TRAITE", dateCreation: new Date(), lue: false, dateLecture: null
});

// ---------------------------------------------------------------------
// 4.7 CLASSE Categorie et Zone (ajouter / modifier / consulter / supprimer)
// ---------------------------------------------------------------------

// ajouter()
lf.categories.insertOne({ nom: "Vêtements", description: "Vestes, écharpes, casquettes" });
lf.zones.insertOne({ nom: "Cinéma", description: "Salles de cinéma", emplacement: "Niveau 3" });

// modifier()
lf.categories.updateOne({ nom: "Vêtements" }, { $set: { description: "Vêtements et accessoires" } });
lf.zones.updateOne({ nom: "Cinéma" }, { $set: { emplacement: "Niveau 3, aile est" } });

// consulter() : liste ou détail
printjson(lf.categories.find().sort({ nom: 1 }).toArray());
printjson(lf.zones.find().sort({ nom: 1 }).toArray());

// supprimer() : refuser si des déclarations utilisent encore la catégorie / zone
const catASupprimer = lf.categories.findOne({ nom: "Vêtements" });
if (lf.declarations.countDocuments({ categorieId: catASupprimer._id }) === 0) {
  lf.categories.deleteOne({ _id: catASupprimer._id });
} else {
  print("Suppression refusée : catégorie encore utilisée.");
}
const zoneASupprimer = lf.zones.findOne({ nom: "Cinéma" });
if (lf.declarations.countDocuments({ zoneId: zoneASupprimer._id }) === 0) {
  lf.zones.deleteOne({ _id: zoneASupprimer._id });
} else {
  print("Suppression refusée : zone encore utilisée.");
}

// ---------------------------------------------------------------------
// 4.8 CLASSE Administrateur
// ---------------------------------------------------------------------

// consulterUtilisateurs() : liste paginée sans les hash
printjson(lf.utilisateurs.find({}, { motDePasseHash: 0 })
  .sort({ dateCreation: -1 }).skip(0).limit(20).toArray());

// modifierUtilisateur() : ex. activer / désactiver un compte
lf.utilisateurs.updateOne({ _id: idSarra }, { $set: { actif: true } });

// supprimerUtilisateur() : suppression LOGIQUE conseillée (actif:false)
// pour ne pas casser déclarations, messages et correspondances liés
// lf.utilisateurs.updateOne({ _id: idSarra }, { $set: { actif: false } });
// Suppression physique (déconseillée) :
// lf.utilisateurs.deleteOne({ _id: idSarra });

// consulterDeclarations() : toutes, tous statuts confondus, filtrables
printjson(lf.declarations.find({ statut: { $in: ["PUBLIEE", "EN_COURS", "SUPPRIMEE"] } })
  .sort({ dateCreation: -1 }).limit(20).toArray());

// supprimerDeclaration() par l'admin : logique...
lf.declarations.updateOne(
  { titre: "Clés de voiture trouvées" },
  { $set: { statut: "SUPPRIMEE", dateModification: new Date() } }
);
// ... ou physique : lf.declarations.deleteOne({ _id: ... });

// consulterStatistiques() : tableau de bord
// a) nombre de déclarations par type et statut
printjson(lf.declarations.aggregate([
  { $group: { _id: { type: "$type", statut: "$statut" }, total: { $sum: 1 } } },
  { $sort: { "_id.type": 1, "_id.statut": 1 } }
]).toArray());

// b) correspondances par statut et score moyen
printjson(lf.correspondances.aggregate([
  { $group: { _id: "$statut", total: { $sum: 1 }, scoreMoyen: { $avg: "$scoreGlobal" } } }
]).toArray());

// c) évolution mensuelle des déclarations
printjson(lf.declarations.aggregate([
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$dateCreation" } },
              total: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray());

// d) signalements traités / non traités
printjson(lf.signalements.aggregate([
  { $group: { _id: { $cond: [{ $eq: ["$dateTraitement", null] }, "NON_TRAITE", "TRAITE"] },
              total: { $sum: 1 } } }
]).toArray());

// e) nombre d'utilisateurs actifs
print("Utilisateurs actifs : " + lf.utilisateurs.countDocuments({ actif: true }));

print("Script terminé.");