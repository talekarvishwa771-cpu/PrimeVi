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
    const tag = currentUser.role === "client" ? "CLIENT" : (currentUser.role === "admin" ? "ADMIN" : currentUser.role.toUpperCase());
    nav.innerHTML = `
      <span class="nav-tag">${tag} · ${escapeHtml(currentUser.name)}</span>
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
  if(currentUser.role === "client"){
    navigate("client");
    renderClient();
  } else {
    navigate("admin");
    switchAdminTab(currentUser.role === "admin" ? "overview" : "manage");
  }
}

// Wipes previously rendered client/admin dashboard content out of the DOM.
// Pages are toggled with CSS (display:none) rather than removed, so
// without this, a signed-out session leaves the last-rendered numbers,
// tables, and names sitting in the hidden markup — visible to anyone who
// views page source, opens dev tools, or uses the browser's reading /
// accessibility mode on that tab afterward.
function clearDashboardDom(){
  const emptyIds = [
    "ovStatusBars", "ovRecent", "adminTableBody", "adminTableHead",
    "userTableBody", "userTableHead", "adminClientsList", "clientProjectsList"
  ];
  emptyIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = "";
  });

  const zeroed = {
    ovStatTotal: "0", ovStatClients: "0", ovStatProgress: "0%",
    ovStatWeb: "0", ovStatVideo: "0", ovStatEarnings: "$0"
  };
  Object.keys(zeroed).forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = zeroed[id];
  });

  const earningsCard = document.getElementById("ovStatEarningsCard");
  if(earningsCard) earningsCard.style.display = "none";

  const greetName = document.getElementById("clientGreetName");
  if(greetName) greetName.textContent = "Welcome back";
}
