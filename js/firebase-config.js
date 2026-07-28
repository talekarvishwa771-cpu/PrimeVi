// js/firebase-config.js
// Firebase project settings — get these values from:
// Firebase Console > Project Settings > General > Your apps > SDK setup and config
const firebaseConfig = {

  apiKey: "AIzaSyBtCu_5mRRVUGsjI3WC5NbYtMS-XofIcH8",
  authDomain: "prime-visuals-6e302.firebaseapp.com",
  projectId: "prime-visuals-6e302",
  storageBucket: "prime-visuals-6e302.firebasestorage.app",
  messagingSenderId: "924323335589",
  appId: "1:924323335589:web:7ea1d66287b1a4089dac4c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
