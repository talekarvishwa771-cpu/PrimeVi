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

function friendlyAuthError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
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
