const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function resolveServiceAccountPath() {
  const envPath = process.env.FIREBASE_KEY_FILE;
  const candidates = [
    envPath,
    path.join(__dirname, 'credentials', 'firebaseServiceAccountKey.json'),
    path.join(__dirname, 'credentials', 'service-account.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      /* ignore errors */
    }
  }
  return null;
}

function loadServiceAccount() {
  const keyPath = resolveServiceAccountPath();
  if (!keyPath) return null;
  try {
    return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

let serviceAccount = null;
if (!admin.apps.length) {
  serviceAccount = loadServiceAccount();
  try {
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      admin.initializeApp();
    }
  } catch (_) {
    try {
      admin.initializeApp();
    } catch (_) {
      /* ignore errors */
    }
  }
}

// Prefer explicit FIREBASE_BUCKET; otherwise derive from service account project_id
const derivedBucket = serviceAccount && serviceAccount.project_id
  ? `${serviceAccount.project_id}.appspot.com`
  : null;
const bucketName = process.env.FIREBASE_BUCKET || derivedBucket || 'ccpccuj.appspot.com';
module.exports = admin.storage().bucket(bucketName);
