// 
// Replaces the demo "any email/password works" login with real Firebase Auth.
// Client and Admin both log in with Firebase email/password.
// Role (client vs admin) is read from a "users" collection in Firestore.

// selectedRole is already declared as a global in state.js — reuse it here

function setRole(role) {
  selectedRole = role;
  document.getElementById("roleClientBtn").classList.toggle("active", role === "client");
  document.getElementById("roleAdminBtn").classList.toggle("active", role === "admin");
}

function presetRole(role) {
  setRole(role);
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const msgEl = document.getElementById("loginMsg");
  msgEl.textContent = "Signing in...";

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;

    // Look up role + profile info from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      msgEl.textContent = "No profile found for this account.";
      await auth.signOut();
      return;
    }

    const userData = userDoc.data(); // { role: "client" | "admin", name: "...", clientId: "..." }

    if (userData.role !== selectedRole) {
      msgEl.textContent = `This account is registered as ${userData.role}, not ${selectedRole}.`;
      await auth.signOut();
      return;
    }

    // Store minimal session info for the rest of the app to use
    sessionStorage.setItem("currentUser", JSON.stringify({
      uid,
      role: userData.role,
      name: userData.name,
      clientId: userData.clientId || null
    }));

    msgEl.textContent = "";
    if (userData.role === "admin") {
      navigate("admin");
    } else {
      navigate("client");
    }
  } catch (err) {
    msgEl.textContent = friendlyAuthError(err.code);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPass").value;
  const msgEl = document.getElementById("signupMsg");
  msgEl.textContent = "Creating account...";

  try {
    // New signups are always client accounts. Admin accounts are created
    // manually in the Firebase console for security.
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;

    await db.collection("users").doc(uid).set({
      role: "client",
      name: name,
      clientId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
    });

    sessionStorage.setItem("currentUser", JSON.stringify({
      uid,
      role: "client",
      name: name,
      clientId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
    }));

    msgEl.textContent = "";
    navigate("client");
  } catch (err) {
    msgEl.textContent = friendlyAuthError(err.code);
  }
}

function toggleAuthMode() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const toggleLink = document.getElementById("authToggleLink");
  const heading = document.getElementById("loginHeading");
  const subCopy = document.getElementById("loginSubCopy");
  const demoNote = document.getElementById("loginDemoNote");

  const showingSignup = signupForm.style.display !== "none";

  if (showingSignup) {
    // Switch back to login
    signupForm.style.display = "none";
    loginForm.style.display = "";
    heading.textContent = "Sign in";
    subCopy.textContent = "Enter your details to reach your project dashboard.";
    demoNote.textContent = "Sign in with your client account, or create a new one below.";
    toggleLink.innerHTML = "Don't have an account? <strong>Sign up</strong>";
  } else {
    // Switch to signup
    loginForm.style.display = "none";
    signupForm.style.display = "";
    heading.textContent = "Create account";
    subCopy.textContent = "Set up client access to submit briefs and track projects.";
    demoNote.textContent = "Signup creates a client account. Agency staff accounts are set up separately.";
    toggleLink.innerHTML = "Already have an account? <strong>Sign in</strong>";
  }
}

function friendlyAuthError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Login failed. Please try again.";
  }
}

function revealStaffLogin() {
  document.getElementById("roleToggle").style.display = "flex";
}

function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  auth.signOut().then(() => {
    sessionStorage.removeItem("currentUser");
    navigate("landing");
  });
}
