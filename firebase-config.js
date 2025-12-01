// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4wgT_94vvG7E1grwuY4qK0w4cWJHRv3c",
  authDomain: "medicine-app-3aeb6.firebaseapp.com",
  projectId: "medicine-app-3aeb6",
  storageBucket: "medicine-app-3aeb6.firebasestorage.app",
  messagingSenderId: "502364239880",
  appId: "1:502364239880:web:a96ec83135a27791d9b9bd",
  measurementId: "G-2CVVCHY3SD"
};

// Initialize Firebase (using compat version)
if (typeof firebase !== 'undefined') {
  const app = firebase.initializeApp(firebaseConfig);
  
  // Initialize Analytics
  let analytics = null;
  if (typeof firebase.analytics !== 'undefined') {
    analytics = firebase.analytics();
  }
  
  // Initialize Auth
  const auth = firebase.auth();
  
  // Initialize Firestore
  const db = firebase.firestore();
  
  // Export for use in other scripts
  window.firebaseApp = app;
  window.firebaseAnalytics = analytics;
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  
  console.log('Firebase initialized successfully');
} else {
  console.error('Firebase SDK not loaded');
}

