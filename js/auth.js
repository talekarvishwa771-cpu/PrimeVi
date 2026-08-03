
let authFlowInProgress = false;

function setRole(role) {
  selectedRole = role;
  document.getElementById("roleClientBtn").classList.toggle("active", role === "client");
  document.getElementById("roleAdminBtn").classList.toggle("active", role === "staff");
}

function presetRole(role) {
  setRole(role);
}

// Swaps a submit button between its normal label and a spinner + loading
// label. Stores the original label on the element so it can be restored
// exactly, regardless of what text was there to start with.
function setBtnLoading(btn, loading, loadingText) {
  if (loading) {
    btn.dataset.originalLabel = btn.dataset.originalLabel || btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> ${loadingText}`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalLabel || btn.textContent;
  }
}

function setFormMsg(msgEl, text, kind) {
  // kind: "ok", "err", or "" (plain/neutral, e.g. "Signing in...")
  msgEl.textContent = text;
  msgEl.className = text ? `form-msg show ${kind || ""}`.trim() : "form-msg";
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const msgEl = document.getElementById("loginMsg");
  const btn = document.getElementById("loginSubmitBtn");

  setFormMsg(msgEl, "Signing in…", "");
  setBtnLoading(btn, true, "Signing in…");
  authFlowInProgress = true;

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;

    // Look up role + profile info from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      setFormMsg(msgEl, "No profile found for this account.", "err");
      await auth.signOut();
      return;
    }

    const userData = userDoc.data(); // { role: "client" | "admin" | staff role, name, phone, clientId }

    const isStaffAccount = userData.role !== "client";
    if (selectedRole === "client" && isStaffAccount) {
      setFormMsg(msgEl, "This account is a staff account. Use staff sign in instead.", "err");
      await auth.signOut();
      return;
    }
    if (selectedRole === "staff" && !isStaffAccount) {
      setFormMsg(msgEl, "This account is a client account. Use client sign in instead.", "err");
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

    setFormMsg(msgEl, "Login successful! Redirecting…", "ok");
    await new Promise(resolve => setTimeout(resolve, 700));

    setFormMsg(msgEl, "", "");
    if (isStaffAccount) {
      navigate("admin");
      switchAdminTab(currentUser.role === "admin" ? "overview" : "manage");
    } else {
      navigate("client");
      renderClient();
    }
  } catch (err) {
    setFormMsg(msgEl, friendlyAuthError(err.code), "err");
  } finally {
    authFlowInProgress = false;
    setBtnLoading(btn, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const pass = document.getElementById("signupPass").value;
  const msgEl = document.getElementById("signupMsg");
  const btn = document.getElementById("signupSubmitBtn");

  setFormMsg(msgEl, "Creating account…", "");
  setBtnLoading(btn, true, "Creating account…");
  authFlowInProgress = true;

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

    setFormMsg(msgEl, "Account created! Redirecting…", "ok");
    await new Promise(resolve => setTimeout(resolve, 700));

    setFormMsg(msgEl, "", "");
    navigate("client");
    renderClient();
  } catch (err) {
    setFormMsg(msgEl, friendlyAuthError(err.code), "err");
  } finally {
    authFlowInProgress = false;
    setBtnLoading(btn, false);
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
  // Kept intentionally unused: /#hello never reveals the Client/Staff
  // toggle — it logs in as staff/admin only, no way to switch to client
  // from this route. See checkHiddenRoute() below.
}

auth.onAuthStateChanged(async function(user){
  if(!user){
    currentUser = null;
    return;
  }
  if(authFlowInProgress) return; // handleLogin/handleSignup already own navigation for this attempt
  if(currentUser) return;
  try{
    // Always re-fetch the role fresh from Firestore on session restore
    // (page refresh, reopened tab) instead of trusting the cached copy
    // in sessionStorage. A cached role can go stale — e.g. an account
    // promoted to admin from the Users tab would otherwise keep showing
    // the restricted "Manage Projects only" view until an explicit
    // sign-out + sign-in, since the old cached role never got refreshed.
    const doc = await db.collection("users").doc(user.uid).get();
    if(!doc.exists) return;
    const d = doc.data();
    currentUser = { uid: user.uid, role: d.role, name: d.name, email: d.email || user.email, phone: d.phone || "", clientId: d.clientId || null };
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
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
    // /#hello is the admin-only back door — no Client/Staff toggle here,
    // it always logs in as staff/admin. The regular "Client Login"
    // buttons on the public site are the only way to reach a client
    // sign-in, and they always preset the client role (see nav.js /
    // index.html), so the two flows never cross.
    setRole("staff");
    document.getElementById("loginHeading").textContent = "Admin sign in";
    document.getElementById("loginSubCopy").textContent = "Restricted access — agency staff only.";
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
    showToast("Signed out");
  });
}
