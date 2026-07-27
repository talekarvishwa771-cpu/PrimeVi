/* ==========================================================
   nav.js — page routing between landing / login / client / admin,
   and the top-nav render
   ========================================================== */

function navigate(view){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + view).classList.add("active");
  window.scrollTo({top:0, behavior:"instant" in window ? "instant" : "auto"});
  renderNav();
}

function renderNav(){
  const nav = document.getElementById("navLinks");
  if(currentUser){
    nav.innerHTML = `
      <span class="nav-tag">${currentUser.role === 'admin' ? 'STAFF' : 'CLIENT'} · ${currentUser.name}</span>
      <button onclick="goToDashboard()">Dashboard</button>
      <button onclick="logout()">Log out</button>
    `;
  } else {
    nav.innerHTML = `
      <a class="navbtn" href="#work" onclick="navigate('landing')">Work</a>
      <button onclick="navigate('login'); presetRole('client')">Client Login</button>
    `;
  }
}

function goToDashboard(){
  if(!currentUser) return;
  if(currentUser.role === "admin"){
    navigate("admin");
    switchAdminTab("overview");
  } else {
    navigate("client");
    renderClient();
  }
}

function logout(){
  currentUser = null;
  navigate("landing");
  showToast("Signed out");
}
