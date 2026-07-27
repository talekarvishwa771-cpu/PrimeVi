/* ==========================================================
   auth.js — role selection, hidden staff-login reveal, sign-in
   ========================================================== */

function presetRole(role){
  // Public entry points only ever preset the client role.
  // The admin/staff role is never exposed here — see revealStaffLogin().
  document.getElementById("roleToggle").style.display = "none";
  document.getElementById("staffAccessLink").style.display = "";
  document.getElementById("loginHeading").textContent = "Sign in";
  document.getElementById("loginSubCopy").textContent = "Enter your details to reach your project dashboard.";
  setRole("client");
}

function revealStaffLogin(){
  document.getElementById("roleToggle").style.display = "flex";
  document.getElementById("staffAccessLink").style.display = "none";
  document.getElementById("loginHeading").textContent = "Staff sign in";
  document.getElementById("loginSubCopy").textContent = "Internal access for the Splice/Stack team.";
  setRole("admin");
}

function setRole(role){
  selectedRole = role;
  document.getElementById("roleClientBtn").classList.toggle("active", role === "client");
  document.getElementById("roleAdminBtn").classList.toggle("active", role === "admin");
  document.getElementById("loginNameLabel").textContent = role === "admin" ? "Staff name" : "Your name / company";
  document.getElementById("loginSubmitBtn").textContent = role === "admin" ? "Enter admin dashboard" : "Enter client portal";
}

function handleLogin(e){
  e.preventDefault();
  const name = document.getElementById("loginName").value.trim();
  const msg = document.getElementById("loginMsg");

  currentUser = { name: name, role: selectedRole };
  msg.className = "form-msg show ok";
  msg.textContent = "Signed in successfully.";

  if(selectedRole === "admin"){
    setTimeout(() => { navigate("admin"); switchAdminTab("overview"); }, 350);
  } else {
    setTimeout(() => { navigate("client"); renderClient(); }, 350);
  }
}
