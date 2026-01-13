import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Configuration
 * 
 * - initialises firebase services for the app.
 * - provides authentication and Firestore database functionality.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDF-W2Ca9NnTXE1AZ_5woqwndeNGOZVnik",
  authDomain: "mobileappdev-7036d.firebaseapp.com",
  projectId: "mobileappdev-7036d",
  storageBucket: "mobileappdev-7036d.firebasestorage.app",
  messagingSenderId: "9149065932",
  appId: "1:9149065932:web:62d035c389e8cc83317069",
  measurementId: "G-GHBM8SZJVJ"
};

// initialise firebase app instance.
const app = initializeApp(firebaseConfig);

// export firebase auth service.
export const auth = getAuth(app);
// export firestore data service
export const db = getFirestore(app);