// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBsdHLVNOXTv5ZrlOgu-oXC4csCpBImSrA",
  authDomain: "shreyshshah.firebaseapp.com",
  databaseURL: "https://shreyshshah-default-rtdb.firebaseio.com",
  projectId: "shreyshshah",
  storageBucket: "shreyshshah.firebasestorage.app",
  messagingSenderId: "918834060355",
  appId: "1:918834060355:web:65e9c613c9e8054fa708f6",
  measurementId: "G-QX2HZ6VNXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const firestore = getFirestore(app);
export default app;