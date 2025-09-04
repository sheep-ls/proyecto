// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de tu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBpWXIG7LJGmYEgnNQUfWupZ0ceNFbyAm4",
  authDomain: "citas-fc4e4.firebaseapp.com",
  projectId: "citas-fc4e4",
  storageBucket: "citas-fc4e4.appspot.com",
  messagingSenderId: "74031889568",
  appId: "1:74031889568:web:34195356be7c233ed65dc5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


//https://console.firebase.google.com/project/citas-22836/firestore/databases/-default-/data/~2Fmessages~2F11b3eetHnozyF5Xk9PQn?hl=es-419
//https://console.firebase.google.com/project/citas-fc4e4/firestore/databases/-default-/data/~2Fmessages~2F11b3eetHnozyF5Xk9PQn?hl=es-419