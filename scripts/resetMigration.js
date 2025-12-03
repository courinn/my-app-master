/**
 * Reset migration flag in Firebase to trigger re-migration.
 * Run with: node scripts/resetMigration.js
 */
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json'); // Ganti dengan path serviceAccountKey.json Anda

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://YOUR_PROJECT_ID.firebaseio.com', // Ganti dengan URL Anda
});

const db = admin.database();

async function resetMigration() {
  try {
    console.log('Resetting migration flag...');
    
    // Delete flag
    await db.ref('app_metadata/hotels_migrated').remove();
    console.log('✓ Migration flag deleted');

    // Optional: Delete existing points jika ingin clean slate
    // await db.ref('points').remove();
    // console.log('✓ Points data cleared');

    console.log('✓ Reset complete. Restart app to trigger migration.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting migration:', error);
    process.exit(1);
  }
}

resetMigration();
