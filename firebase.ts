import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { initializeFirestore, Firestore, setLogLevel } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getFunctions, Functions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAOxQhwGu1RskJXj71G5dcsePN92Cy0TDg",
  authDomain: "mustafa1-c956c.firebaseapp.com",
  databaseURL: "https://mustafa1-c956c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mustafa1-c956c",
  storageBucket: "mustafa1-c956c.firebasestorage.app",
  messagingSenderId: "85469604702",
  appId: "1:85469604702:web:a982162e37416ca09dbdcf",
  measurementId: "G-T4YR71XRF2"
};


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let functions: Functions | null = null;

// Only initialize Firebase if a valid API key is provided (not the placeholder)
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_PLACEHOLDER") {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true,
            useFetchStreams: false
        });
        setLogLevel('error');
        rtdb = getDatabase(app);
        functions = getFunctions(app);
        getAnalytics(app);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // In case of any other initialization error, ensure services remain null.
        auth = null;
        db = null;
        rtdb = null;
    }
} else {
    console.warn("Firebase config not found or invalid. Firebase features will be disabled.");
}

const googleProvider = new GoogleAuthProvider();

export { auth, db, rtdb, functions, googleProvider };
