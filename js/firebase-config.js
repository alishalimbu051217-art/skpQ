// ---------------------------------------------------------
// SkpQ — Firebase configuration
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyARSurduXJB3wP_NwJSinQW4NNyTknELzk",
  authDomain: "the-rek-skpq.firebaseapp.com",
  projectId: "the-rek-skpq",
  storageBucket: "the-rek-skpq.firebasestorage.app",
  messagingSenderId: "1017580705608",
  appId: "1:1017580705608:web:de08471f3e18cf4a6f857d",
  measurementId: "G-0NTJFQ458S"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Cache Firestore data locally (IndexedDB) and queue writes made while
// offline so they sync automatically once the connection returns.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Offline persistence only works in one tab at a time on this browser.');
    } else if (err.code === 'unimplemented') {
        console.warn('This browser does not support offline persistence.');
    }
});
