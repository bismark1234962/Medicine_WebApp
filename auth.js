// Firebase Authentication Module
let currentUser = null;
let authStateListeners = [];

// Initialize auth state listener
const initAuth = () => {
  if (typeof window.firebaseAuth === 'undefined') {
    console.error('Firebase Auth not initialized');
    return;
  }

  window.firebaseAuth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthState();
    authStateListeners.forEach(listener => listener(user));
  });
};

// Update authentication state in UI
const updateAuthState = () => {
  const isAuth = currentUser !== null;
  document.body.classList.toggle('authenticated', isAuth);
  document.body.classList.toggle('not-authenticated', !isAuth);
};

// Get current user
const getCurrentUser = () => currentUser;

// Check if user is authenticated
const isAuthenticated = () => currentUser !== null;

// Sign up with email and password
const signUp = async (email, password, fullName, phoneNumber) => {
  try {
    if (typeof window.firebaseAuth === 'undefined') {
      throw new Error('Firebase Auth not initialized');
    }

    console.log('Attempting to sign up with:', email);
    // Create user account
    const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(
      email,
      password
    );

    console.log('User created:', userCredential.user.uid);
    // Update user profile with display name
    await userCredential.user.updateProfile({
      displayName: fullName
    });

    // Save additional user data to Firestore
    if (window.firebaseDb) {
      await window.firebaseDb.collection('users').doc(userCredential.user.uid).set({
        fullName: fullName,
        email: email,
        phoneNumber: phoneNumber,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log('Sign up successful:', email);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with email and password
const signIn = async (email, password) => {
  try {
    if (typeof window.firebaseAuth === 'undefined') {
      throw new Error('Firebase Auth not initialized');
    }

    console.log('Attempting to sign in with:', email);
    const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(
      email,
      password
    );

    console.log('Sign in successful:', userCredential.user.email);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
const signOut = async () => {
  try {
    if (typeof window.firebaseAuth === 'undefined') {
      throw new Error('Firebase Auth not initialized');
    }

    await window.firebaseAuth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// Password reset
const resetPassword = async (email) => {
  try {
    if (typeof window.firebaseAuth === 'undefined') {
      throw new Error('Firebase Auth not initialized');
    }

    await window.firebaseAuth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// Add auth state listener
const onAuthStateChanged = (callback) => {
  authStateListeners.push(callback);
  // Immediately call with current user
  if (currentUser !== null) {
    callback(currentUser);
  }
};

// Initialize when Firebase is ready
if (typeof window !== 'undefined') {
  // Wait for Firebase to be loaded
  const checkFirebase = setInterval(() => {
    if (typeof window.firebaseAuth !== 'undefined') {
      clearInterval(checkFirebase);
      initAuth();
    }
  }, 100);

  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkFirebase);
  }, 5000);
}

// Export functions
window.authModule = {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChanged,
  initAuth
};

