/* ==========================================================
   data-sync.js — keeps `projects` and `siteSettings` in sync
   with Firestore instead of localStorage.

   Projects: collection "projects", one document per project,
   kept live via onSnapshot so admin + client views update
   automatically whenever anything changes (add/edit/delete),
   including changes made by someone else in another tab/device.

   Site settings: single document siteData/settings.
   ========================================================== */

let unsubscribeProjects = null;

function startProjectsSync(){
  if(unsubscribeProjects) return; // already listening
  unsubscribeProjects = db.collection("projects").onSnapshot(
    (snapshot) => {
      projects = snapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
      refreshVisibleProjectViews();
    },
    (err) => {
      console.warn("Projects sync error", err);
    }
  );
}

function stopProjectsSync(){
  if(unsubscribeProjects){
    unsubscribeProjects();
    unsubscribeProjects = null;
  }
  projects = [];
}

/* Re-render whichever project-driven view happens to be on screen
   right now (safe to call all of them — the others just update
   hidden DOM, which is cheap). */
function refreshVisibleProjectViews(){
  if(typeof renderAdminOverview === "function") renderAdminOverview();
  if(typeof renderAdmin === "function") renderAdmin();
  if(typeof renderAdminClients === "function") renderAdminClients();
  if(currentUser && currentUser.role === "client" && typeof renderClient === "function") renderClient();
}

async function loadSiteSettingsFromFirestore(){
  try {
    const doc = await db.collection("siteData").doc("settings").get();
    if(doc.exists){
      siteSettings = doc.data();
    } else {
      // first run — seed Firestore with the current defaults
      await db.collection("siteData").doc("settings").set(siteSettings);
    }
    applySiteSettings();
    renderFeaturesPublic();
    if(typeof renderSettingsForm === "function" && document.getElementById("setTitle")){
      renderSettingsForm();
    }
  } catch(err) {
    console.warn("Could not load site settings from Firestore, using local defaults.", err);
  }
}
