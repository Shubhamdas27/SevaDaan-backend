import admin from 'firebase-admin';

/**
 * Write data to Firebase Realtime Database
 * @param path Path in the database (e.g. '/users/user1')
 * @param data Data to write
 */
export async function writeToRealtimeDB(path: string, data: any) {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  await admin.database().ref(path).set(data);
}

/**
 * Read data from Firebase Realtime Database
 * @param path Path in the database (e.g. '/users/user1')
 */
export async function readFromRealtimeDB(path: string) {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  const snapshot = await admin.database().ref(path).once('value');
  return snapshot.val();
}
