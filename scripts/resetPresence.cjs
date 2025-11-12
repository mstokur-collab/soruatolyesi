const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID || 'mustafa1-c956c';
const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app`;

if (!admin.apps.length) {
  admin.initializeApp({ projectId, databaseURL });
}

const db = admin.database();

const resetPresence = async () => {
  const statusRef = db.ref('/status');
  const snapshot = await statusRef.once('value');
  if (!snapshot.exists()) {
    console.log('No presence records found.');
    return;
  }

  const updates = {};
  snapshot.forEach((child) => {
    if (!child.key) return;
    updates[`${child.key}/isOnline`] = false;
    updates[`${child.key}/lastSeen`] = Date.now();
  });

  if (!Object.keys(updates).length) {
    console.log('No updatable presence nodes.');
    return;
  }

  await statusRef.update(updates);
  console.log(`Marked ${Object.keys(updates).length / 2} presence entries as offline.`);
};

resetPresence()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Presence reset failed:', err);
    process.exit(1);
  });
