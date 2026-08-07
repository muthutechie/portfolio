// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyDIRD8C4Jc3jtMsDWXmf_rdqvjLdiXht1Q",
  authDomain: "daily-planner-3ccea.firebaseapp.com",
  projectId: "daily-planner-3ccea",
  storageBucket: "daily-planner-3ccea.firebasestorage.app",
  messagingSenderId: "799880319637",
  appId: "1:799880319637:web:bb3694871080936587819c",
  measurementId: "G-9ZKR71XPL3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Default document path
let docPath = { collection: 'routine', doc: 'muthu' };

// Initialize settings from localStorage if available
try {
  const localSettings = localStorage.getItem('trioviz_planner_settings');
  if (localSettings) {
    const parsed = JSON.parse(localSettings);
    if (parsed.collection && parsed.doc) {
      docPath.collection = parsed.collection;
      docPath.doc = parsed.doc;
    }
  }
} catch (e) {
  console.error("Failed to load local settings", e);
}

// Get document reference
function getDocRef() {
  return db.collection(docPath.collection).doc(docPath.doc);
}

// Global functions for firebase persistence
window.FirebaseSync = {
  getDocPath: () => docPath,
  setDocPath: (collection, doc) => {
    docPath.collection = collection;
    docPath.doc = doc;
    try {
      localStorage.setItem('trioviz_planner_settings', JSON.stringify(docPath));
    } catch (e) {
      console.error(e);
    }
  },
  
  // Load data from Firestore
  loadData: async () => {
    try {
      const snap = await getDocRef().get();
      if (snap.exists) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.error("Firestore read error: ", err);
      throw err;
    }
  },
  
  // Save data to Firestore
  saveData: async (data) => {
    try {
      await getDocRef().set(data, { merge: true });
      return true;
    } catch (err) {
      console.error("Firestore write error: ", err);
      throw err;
    }
  }
};
