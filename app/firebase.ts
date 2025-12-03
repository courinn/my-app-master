import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyA8KEFjO-xp19DES3qfmPT_YyqCTJ8uqSk",
    authDomain: "reactnative-e52f1.firebaseapp.com",
    databaseURL: "https://reactnative-e52f1-default-rtdb.firebaseio.com",
    projectId: "reactnative-e52f1",
    storageBucket: "reactnative-e52f1.firebasestorage.app",
    messagingSenderId: "515870406401",
    appId: "1:515870406401:web:98c6a10b56aa807abb4d00"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { auth, db };

