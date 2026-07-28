// 
// Replaces the demo "any email/password works" login with real Firebase Auth.
// Client and Admin both log in with Firebase email/password.
// Role (client vs admin) is read from a "users" collection in Firestore.

// selectedRole is already declared as a global in state.js — reuse it here

function setRole(role) {
  selectedRole = role;
  document.getElementById("roleClientBtn").classList.toggle("active", role === "client");
  document.getElementById("roleAdminBtn").classList.toggle("active", role === "staff");
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

    const userData = userDoc.data(); // { role: "client" | "admin" | staff role, name, phone, clientId }

    const isStaffAccount = userData.role !== "client";
    if (selectedRole === "client" && isStaffAccount) {
      msgEl.textContent = "This account is a staff account. Use staff sign in instead.";
      await auth.signOut();
      return;
    }
    if (selectedRole === "staff" && !isStaffAccount) {
      msgEl.textContent = "This account is a client account. Use client sign in instead.";
      await auth.signOut();
      return;
    }

    currentUser = {
      uid,
      role: userData.role,
      name: userData.name,
      email: userData.email || email,
      phone: userData.phone || "",
      clientId: userData.clientId || null
    };
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    await loadProjects();

    msgEl.textContent = "";
    if (isStaffAccount) {
      navigate("admin");
      switchAdminTab(currentUser.role === "admin" ? "overview" : "manage");
    } else {
      navigate("client");
      renderClient();
    }
  } catch (err) {
    msgEl.textContent = friendlyAuthError(err.code);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const pass = document.getElementById("signupPass").value;
  const msgEl = document.getElementById("signupMsg");
  msgEl.textContent = "Creating account...";

  try {
    // New signups are always client accounts. Staff/admin accounts are
    // created by signing up, then an admin edits their role in Users tab.
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;
    const clientId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

    await db.collection("users").doc(uid).set({
      role: "client",
      name: name,
      email: email,
      phone: phone,
      clientId: clientId
    });

    currentUser = { uid, role: "client", name, email, phone, clientId };
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    msgEl.textContent = "";
    navigate("client");
    renderClient();
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

auth.onAuthStateChanged(async function(user){
  if(!user){
    currentUser = null;
    return;
  }
  if(currentUser) return;
  try{
    const cached = sessionStorage.getItem("currentUser");
    if(cached){
      currentUser = JSON.parse(cached);
    } else {
      const doc = await db.collection("users").doc(user.uid).get();
      if(!doc.exists) return;
      const d = doc.data();
      currentUser = { uid: user.uid, role: d.role, name: d.name, email: d.email || user.email, phone: d.phone || "", clientId: d.clientId || null };
      sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    await loadProjects();
    renderNav();
    if(location.hash.toLowerCase() !== "#hello") goToDashboard();
  } catch(e){
    console.warn("Session restore failed", e);
  }
});

function checkHiddenRoute() {
  if (location.hash.toLowerCase() === "#hello") {
    navigate("login");
    revealStaffLogin();
    setRole("staff");
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  auth.signOut().then(() => {
    sessionStorage.removeItem("currentUser");
    currentUser = null;
    projects = [];
    allUsers = [];
    navigate("landing");
  });
}
