const functions = require("firebase-functions");
const admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

const FIREBASE_STORAGE_BUCKET = "fir-recipes-87ae1.appspot.com";

const apiFirebaseOptions = {
  ...functions.config().firebase,
  projectId: "fir-recipes-87ae1",
  credential: admin.credential.cert(serviceAccount),
  storageBucket: FIREBASE_STORAGE_BUCKET,
};

admin.initializeApp(apiFirebaseOptions);

const firestore = admin.firestore();

const settings = { timestampsInSnapshots: true };

firestore.settings(settings);

const storageBucket = admin.storage().bucket();

const auth = admin.auth();

module.exports = { functions, auth, firestore, storageBucket, admin };
