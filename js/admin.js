const STATUS_LIST = ["Submitted", "In Progress", "In Review", "On Hold", "Completed"];

let adminFilters = { text: "", type: "All", status: "All", sort: "client" };
let userFilterText = "";

function isFullAdmin(){
  return currentUser && currentUser.role === "admin";
}

function applyAdminRoleUI(){
  const allowed = isFullAdmin() ? null : ["manage"];
  document.querySelectorAll("#page-admin .portal-tabs button").forEach(b => {
    b.style.display = (!allowed || allowed.includes(b.dataset.tab)) ? "" : "none";
  });
}

function switchAdminTab(tab){
  applyAdminRoleUI();
  if(!isFullAdmin()) tab = "manage";
  document.querySelectorAll("#page-admin .portal-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("#page-admin .tabpane").forEach(p => p.classList.remove("active"));
  document.getElementById("adminTab-" + tab).classList.add("active");
  if(tab === "overview") renderAdminOverview();
  if(tab === "manage") renderAdmin();
  if(tab === "clients") renderAdminClients();
  if(tab === "users") renderAdminUsers();
  if(tab === "portfolio"){ renderPortfolioEditor(); renderWebPortfolioEditor(); }
  if(tab === "settings") renderSettingsForm();
}

/* ---------- Overview ---------- */

function renderAdminOverview(){
  const total = projects.length;
  const clients = new Set(projects.map(p => p.client.trim().toLowerCase())).size;
  const avgProgress = total ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total) : 0;
  const webCount = projects.filter(p => p.type === "Web Development").length;
  const videoCount = projects.filter(p => p.type === "Video Editing").length;

  document.getElementById("ovStatTotal").textContent = total;
  document.getElementById("ovStatClients").textContent = clients;
  document.getElementById("ovStatProgress").textContent = avgProgress + "%";
  document.getElementById("ovStatWeb").textContent = webCount;
  document.getElementById("ovStatVideo").textContent = videoCount;

  const earningsCard = document.getElementById("ovStatEarningsCard");
  if(isFullAdmin()){
    const totalEarnings = projects.reduce((sum, p) => sum + (Number(p.earning) || 0), 0);
    earningsCard.style.display = "";
    document.getElementById("ovStatEarnings").textContent = "$" + totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    earningsCard.style.display = "none";
  }

  const maxCount = Math.max(1, ...STATUS_LIST.map(s => projects.filter(p => p.status === s).length));
  document.getElementById("ovStatusBars").innerHTML = STATUS_LIST.map(s => {
    const count = projects.filter(p => p.status === s).length;
    const pct = Math.round((count / maxCount) * 100);
    return `
      <div class="ov-bar-row">
        <span class="ov-bar-label">${s}</span>
        <div class="ov-bar-track"><div class="ov-bar-fill" style="width:${pct}%;"></div></div>
        <span class="ov-bar-count mono">${count}</span>
      </div>`;
  }).join("");

  const recent = [...projects].slice(-5).reverse();
  document.getElementById("ovRecent").innerHTML = recent.length ? recent.map(p => `
    <div class="ov-recent-row">
      <div>
        <strong>${escapeHtml(p.title)}</strong>
        <span class="mono" style="color:var(--text-faint); font-size:0.76rem;"> — ${escapeHtml(p.client)}</span>
      </div>
      <span class="badge ${statusBadgeClass(p.status)}">${p.status}</span>
    </div>
  `).join("") : `<p style="color:var(--text-dim); font-size:0.85rem;">No projects yet.</p>`;
}

function exportData(){
  const payload = JSON.stringify({ projects, siteSettings }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "splice-stack-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Data exported as JSON");
}

/* ---------- Manage Projects ---------- */

function getFilteredProjects(){
  const q = adminFilters.text.trim().toLowerCase();
  let list = projects.filter(p => {
    const matchesText = !q || p.client.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
    const matchesType = adminFilters.type === "All" || p.type === adminFilters.type;
    const matchesStatus = adminFilters.status === "All" || p.status === adminFilters.status;
    return matchesText && matchesType && matchesStatus;
  });

  list.sort((a, b) => {
    switch(adminFilters.sort){
      case "progress-desc": return b.progress - a.progress;
      case "progress-asc": return a.progress - b.progress;
      case "title": return a.title.localeCompare(b.title);
      case "status": return a.status.localeCompare(b.status);
      default: return a.client.localeCompare(b.client);
    }
  });

  return list;
}

function setAdminFilterText(val){ adminFilters.text = val; renderAdmin(); }
function setAdminFilterType(val){ adminFilters.type = val; renderAdmin(); }
function setAdminFilterStatus(val){ adminFilters.status = val; renderAdmin(); }
function setAdminSort(val){ adminFilters.sort = val; renderAdmin(); }

function filterAdminByClient(clientName){
  adminFilters.text = clientName;
  document.getElementById("adminSearch").value = clientName;
  switchAdminTab("manage");
}

function renderAdmin(){
  const admin = isFullAdmin();
  const head = document.getElementById("adminTableHead");
  head.innerHTML = `
    <th>Client</th>
    <th>Project</th>
    <th>Type</th>
    <th>Progress</th>
    <th>Status</th>
    <th>Footage</th>
    ${admin ? "<th>Earning</th>" : ""}
    <th>Actions</th>
  `;

  const list = getFilteredProjects();
  const totalCount = projects.length;
  document.getElementById("adminCount").textContent =
    (list.length === totalCount)
      ? `${totalCount} project${totalCount === 1 ? "" : "s"}`
      : `${list.length} of ${totalCount} projects`;

  const body = document.getElementById("adminTableBody");
  const colCount = admin ? 8 : 7;

  if(list.length === 0){
    body.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center; color:var(--text-faint); padding:32px;">No projects match your filters.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => `
    <tr>
      <td><input type="text" class="row-text" style="width:130px;" value="${escapeHtml(p.client)}" id="client-${p.id}" ${admin ? "" : "disabled"}></td>
      <td><input type="text" class="row-text" style="width:150px;" value="${escapeHtml(p.title)}" id="title-${p.id}" ${admin ? "" : "disabled"}></td>
      <td>
        <select class="row-select" id="type-${p.id}" ${admin ? "" : "disabled"}>
          <option value="Web Development" ${p.type === "Web Development" ? "selected" : ""}>Web Development</option>
          <option value="Video Editing" ${p.type === "Video Editing" ? "selected" : ""}>Video Editing</option>
        </select>
      </td>
      <td>
        <div class="progress-inline">
          <input type="number" class="row-text" style="width:60px;" min="0" max="100" value="${p.progress}" id="prog-${p.id}">
          <div class="scrub"><div class="scrub-fill" style="width:${p.progress}%;"></div></div>
        </div>
      </td>
      <td>
        <select class="row-select" id="status-${p.id}">
          ${STATUS_LIST.map(s => `<option value="${s}" ${s === p.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>${p.footageLink ? `<a href="${escapeHtml(p.footageLink)}" target="_blank" rel="noopener noreferrer">Open link</a>` : `<span class="mono" style="color:var(--text-faint); font-size:0.76rem;">—</span>`}</td>
      ${admin ? `<td><input type="number" class="row-text" style="width:90px;" min="0" step="0.01" value="${Number(p.earning) || 0}" id="earning-${p.id}"></td>` : ""}
      <td class="row-actions">
        <button class="btn btn-sm btn-mint" onclick="saveProject('${p.id}')">Save</button>
        ${admin ? `<button class="btn btn-sm btn-ghost btn-icon" onclick="deleteProject('${p.id}')" aria-label="Delete project" title="Delete project">✕</button>` : ""}
      </td>
    </tr>
  `).join("");
}

async function saveProject(id){
  const p = projects.find(pr => pr.id === id);
  if(!p) return;
  const admin = isFullAdmin();
  const progVal = Math.max(0, Math.min(100, parseInt(document.getElementById("prog-" + id).value, 10) || 0));
  const statusVal = document.getElementById("status-" + id).value;

  const fields = { progress: progVal, status: statusVal };

  if(admin){
    fields.client = document.getElementById("client-" + id).value.trim() || p.client;
    fields.title = document.getElementById("title-" + id).value.trim() || p.title;
    fields.type = document.getElementById("type-" + id).value;
    fields.earning = Math.max(0, parseFloat(document.getElementById("earning-" + id).value) || 0);
  }

  const milestones = p.milestones.map(m => Object.assign({}, m));
  const doneCount = Math.floor((progVal / 100) * milestones.length);
  milestones.forEach((m, i) => {
    m.done = i < doneCount;
    m.current = i === doneCount;
  });
  if(statusVal === "Completed"){
    fields.progress = 100;
    milestones.forEach(m => { m.done = true; m.current = false; });
  }
  fields.milestones = milestones;

  try{
    await updateProjectFields(id, fields);
    renderAdmin();
    showToast(`${p.title} updated`);
  } catch(err){
    console.error(err);
    showToast("Save failed — check your connection");
  }
}

async function deleteProject(id){
  const p = projects.find(pr => pr.id === id);
  if(!p) return;
  if(!confirm(`Delete "${p.title}" for ${p.client}? This can't be undone.`)) return;
  try{
    await deleteProjectRemote(id);
    renderAdmin();
    showToast(`Deleted: ${p.title}`);
  } catch(err){
    console.error(err);
    showToast("Delete failed — check your connection");
  }
}

async function addProject(e){
  e.preventDefault();
  const client = document.getElementById("newClientName").value.trim();
  const title = document.getElementById("newProjTitle").value.trim();
  const type = document.getElementById("newProjType").value;
  const status = document.getElementById("newProjStatus").value;
  const progress = Math.max(0, Math.min(100, parseInt(document.getElementById("newProjProgress").value, 10) || 0));
  const earning = Math.max(0, parseFloat(document.getElementById("newProjEarning").value) || 0);

  const matchedUser = allUsers.find(u => u.role === "client" && u.name.trim().toLowerCase() === client.toLowerCase());

  const data = {
    client, title, type, progress, status, earning,
    clientUid: matchedUser ? matchedUser.uid : null,
    footageLink: "",
    milestones: defaultMilestones(type, progress)
  };

  try{
    await createProject(data);
    const msg = document.getElementById("newProjMsg");
    msg.className = "form-msg show ok";
    msg.textContent = "Project added to the system.";
    e.target.reset();
    document.getElementById("newProjProgress").value = 0;
    document.getElementById("newProjEarning").value = 0;
    showToast("New project added: " + title);
    setTimeout(() => switchAdminTab('manage'), 700);
  } catch(err){
    console.error(err);
    showToast("Could not add project — check your connection");
  }
}

/* ---------- Clients ---------- */

function renderAdminClients(){
  const admin = isFullAdmin();
  const byClient = {};
  projects.forEach(p => {
    const key = p.client.trim();
    if(!byClient[key]) byClient[key] = [];
    byClient[key].push(p);
  });

  const names = Object.keys(byClient).sort((a, b) => a.localeCompare(b));
  const wrap = document.getElementById("adminClientsList");

  if(names.length === 0){
    wrap.innerHTML = `<div class="empty-state"><h3>No clients yet</h3><p>Clients appear here once a project is added under their name.</p></div>`;
    return;
  }

  wrap.innerHTML = names.map(name => {
    const projList = byClient[name];
    const avg = Math.round(projList.reduce((s, p) => s + p.progress, 0) / projList.length);
    const activeCount = projList.filter(p => p.status !== "Completed").length;
    const earningsTotal = projList.reduce((s, p) => s + (Number(p.earning) || 0), 0);
    const safeName = name.replace(/'/g, "\\'");
    return `
      <div class="client-card">
        <div class="client-card-top">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <span class="mono" style="font-size:0.76rem; color:var(--text-faint);">${projList.length} project${projList.length === 1 ? "" : "s"} · ${activeCount} active · avg ${avg}%${admin ? " · $" + earningsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " earned" : ""}</span>
          </div>
          <div class="client-card-actions">
            <button class="btn btn-sm" onclick="filterAdminByClient('${safeName}')">View projects</button>
            ${admin ? `<button class="btn btn-sm btn-ghost btn-icon" onclick="deleteClient('${safeName}')" aria-label="Delete all projects for this client" title="Delete all projects for this client">✕</button>` : ""}
          </div>
        </div>
        <div class="client-card-tags">
          ${projList.map(p => `<span class="badge ${statusBadgeClass(p.status)}">${escapeHtml(p.title)} · ${p.status}</span>`).join("")}
        </div>
      </div>`;
  }).join("");
}

async function deleteClient(name){
  const list = projects.filter(p => p.client.trim() === name);
  if(!confirm(`Delete all ${list.length} project(s) for ${name}? This can't be undone.`)) return;
  try{
    await Promise.all(list.map(p => deleteProjectRemote(p.id)));
    renderAdminClients();
    showToast(`Removed all projects for ${name}`);
  } catch(err){
    console.error(err);
    showToast("Delete failed — check your connection");
  }
}

/* ---------- Users ---------- */

const STAFF_ROLE_OPTIONS = ["client", "editor", "manager", "admin"];

async function renderAdminUsers(search){
  if(typeof search === "string") userFilterText = search;
  const admin = isFullAdmin();
  const wrap = document.getElementById("userTableBody");
  const head = document.getElementById("userTableHead");
  head.innerHTML = `<th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Projects</th><th>Actions</th>`;
  wrap.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-faint); padding:24px;">Loading users…</td></tr>`;

  try{
    if(!allUsers.length) await loadUsers();
  } catch(err){
    console.error(err);
    wrap.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-faint); padding:24px;">Could not load users.</td></tr>`;
    return;
  }

  const q = userFilterText.trim().toLowerCase();
  const list = allUsers.filter(u => !q || u.name.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));

  if(list.length === 0){
    wrap.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-faint); padding:24px;">No users match.</td></tr>`;
    return;
  }

  wrap.innerHTML = list.map(u => {
    const projCount = projects.filter(p => p.clientUid === u.uid || p.client.trim().toLowerCase() === (u.name || "").trim().toLowerCase()).length;
    return `
    <tr>
      <td><input type="text" class="row-text" style="width:140px;" value="${escapeHtml(u.name || "")}" id="uname-${u.uid}"></td>
      <td><span class="mono" style="font-size:0.78rem;">${escapeHtml(u.email || "")}</span></td>
      <td><input type="text" class="row-text" style="width:130px;" value="${escapeHtml(u.phone || "")}" id="uphone-${u.uid}"></td>
      <td>
        <select class="row-select" id="urole-${u.uid}">
          ${STAFF_ROLE_OPTIONS.map(r => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}
        </select>
      </td>
      <td class="mono" style="font-size:0.78rem;">${projCount}</td>
      <td class="row-actions">
        <button class="btn btn-sm btn-mint" onclick="saveUserRow('${u.uid}')">Save</button>
        ${u.email ? `<a class="btn btn-sm" href="mailto:${escapeHtml(u.email)}">Email</a>` : ""}
        ${u.phone ? `<a class="btn btn-sm" href="tel:${escapeHtml(u.phone.replace(/[^\d+]/g, ""))}">Call</a>` : ""}
        <button class="btn btn-sm btn-ghost" onclick="filterAdminByClient('${(u.name || "").replace(/'/g, "\\'")}')">Projects</button>
        ${admin ? `<button class="btn btn-sm btn-ghost btn-icon" onclick="deleteUserRow('${u.uid}')" aria-label="Delete user" title="Delete user">✕</button>` : ""}
      </td>
    </tr>`;
  }).join("");
}

async function deleteUserRow(uid){
  const u = allUsers.find(x => x.uid === uid);
  if(!u) return;
  if(currentUser && currentUser.uid === uid){
    showToast("You can't delete your own account while signed in");
    return;
  }
  if(!confirm(`Delete user "${u.name || u.email || "this user"}"? This can't be undone.`)) return;
  try{
    await deleteUser(uid);
    renderAdminUsers(userFilterText);
    showToast(`Deleted user: ${u.name || u.email || uid}`);
  } catch(err){
    console.error(err);
    showToast("Delete failed — check your connection");
  }
}

async function saveUserRow(uid){
  const name = document.getElementById("uname-" + uid).value.trim();
  const phone = document.getElementById("uphone-" + uid).value.trim();
  const role = document.getElementById("urole-" + uid).value;
  try{
    await updateUserFields(uid, { name, phone, role });
    renderAdminUsers(userFilterText);
    showToast("User updated");
  } catch(err){
    console.error(err);
    showToast("Update failed — check your connection");
  }
}
