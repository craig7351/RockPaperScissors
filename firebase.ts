import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAHazcK1eudEHnuumLbPpegTDzBB_Sq2Vs",
  authDomain: "all-db-559ac.firebaseapp.com",
  projectId: "all-db-559ac",
  storageBucket: "all-db-559ac.firebasestorage.app",
  messagingSenderId: "74638044454",
  appId: "1:74638044454:web:924d523a7ca9769625e5e7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
