// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "researchgem-73bfb.firebaseapp.com",
    projectId: "researchgem-73bfb",
    storageBucket: "researchgem-73bfb.firebasestorage.app",
    messagingSenderId: "529146279176",
    appId: "1:529146279176:web:85ce4df1c4b0a5c2e8e8bd",
    measurementId: "G-4388MYD25M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, app, db }