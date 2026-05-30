import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// I-export ang Auth at Firestore Database
export const auth = getAuth(app);
export const db = getFirestore(app); 

// Google Auth Provider setup
export const googleProvider = new GoogleAuthProvider();
// Pwersahin ang Google na ibigay ang email address ng user upang hindi ito mag-null
googleProvider.addScope("email");

/**
 * Google Sign-In Function
 * Awtomatikong sine-save o ina-update ang profile ng user sa 'users' collection
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user; 

    // Gagawa ng document sa 'users' collection gamit ang UID bilang Document ID
    const userDocRef = doc(db, "users", user.uid);

    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: user.displayName, 
      email: user.email,             
      photoURL: user.photoURL,       
      lastLogin: serverTimestamp()   
    }, { merge: true }); 

    return result;
  } catch (error) {
    console.error("Error sa Google Sign-In o pag-save ng user:", error);
    throw error;
  }
}

/**
 * Function para i-save ang bawat translation session ng user
 * @param {string} originalText - Ang boses o text na isinalin (e.g., "Magandang umaga")
 * @param {string} translatedText - Ang naging resulta ng translation (e.g., "Good morning")
 * @param {string} languagePair - Ang direksyon ng translation (e.g., "tl-en")
 */
export async function saveTranslation(originalText, translatedText, languagePair) {
  // Siguraduhing may naka-login na user bago mag-save
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("Walang user na naka-login. Hindi mai-save ang history.");
    return null;
  }

  try {
    // Binubuo ang pag-add ng bagong data sa 'translation_history' collection
    const docRef = await addDoc(collection(db, "translation_history"), {
      userId: currentUser.uid,          // Kinokonekta ang translation sa mismong user gamit ang UID
      original: originalText,          // Ang orihinal na salita
      translated: translatedText,      // Ang kinalabasang salita
      languages: languagePair,         // Source at Target language
      createdAt: serverTimestamp()     // Selyo ng oras at petsa mula sa Firebase server
    });

    console.log("Translation history matagumpay na nai-save sa ID na:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error sa pag-save ng translation history:", error);
    throw error;
  }
}

// Logout Function
export function logout() {
  return signOut(auth);
}

export default app;
