// D:\Plantas_frontend\src\firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where
} from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- NOVO: Importa o Firebase Storage

const firebaseConfig = {
    apiKey: "AIzaSyBzdhbvbukDyEEso893c7L95BTZ5jFC13I",
    authDomain: "plantasapp.firebaseapp.com",
    projectId: "plantasapp",
    storageBucket: "plantasapp.firebasestorage.app", // <-- Verifique se este é o bucket correto do seu projeto
    messagingSenderId: "67287939165",
    appId: "1:67287939165:web:8bdeb8a3acd5d18144b5b4",
    measurementId: "G-WKCSY96CXL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // <-- NOVO: Inicializa o Firebase Storage

// Exportando todas as funções usadas no Editor, autenticação e Storage
export { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc, auth, query, where, storage }; // <-- NOVO: Exporta 'storage'
