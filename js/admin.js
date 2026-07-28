/* ==========================================================
   admin.js — full admin panel:
   - Overview: at-a-glance stats across all projects
   - Manage Projects: search/filter/sort table, inline edit
     (client, title, type, progress, status), delete
   - Clients: aggregated per-client view, jump-to-filter, bulk delete
   - Add New Project
   - Site Settings (see settings.js)
   - Export data / reset demo data
   ========================================================== */

const STATUS_LIST = ["Submitted", "In Progress", "In Review", "On Hold", "Completed"];

let adminFilters = { text: "", type: "All", status: "All", sort: "client" };

function switchAdminTab(tab){
  document.querySelectorAll("#page-admin .portal-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("#page-admin .tabpane").forEach(p => p.classList.remove("active"));
  document.getElementById("adminTab-" + tab).classList.add("active");
  if(tab === "overview") renderAdminOverview();
  if(tab === "manage") renderAdmin();
  if(tab === "clients") renderAdminClients();
  if(tab === "portfolio") renderPortfolioEditor();
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
  const list = getFilteredProjects();
  const totalCount = projects.length;
  document.getElementById("adminCount").textContent =
    (list.length === totalCount)
      ? `${totalCount} project${totalCount === 1 ? "" : "s"}`
      : `${list.length} of ${totalCount} projects`;

  const body = document.getElementById("adminTableBody");

  if(list.length === 0){
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-faint); padding:32px;">No projects match your filters.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => `
    <tr>
      <td><input type="text" class="row-text" style="width:130px;" value="${escapeHtml(p.client)}" id="client-${p.id}"></td>
      <td><input type="text" class="row-text" style="width:150px;" value="${escapeHtml(p.title)}" id="title-${p.id}"></td>
      <td>
        <select class="row-select" id="type-${p.id}">
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
      <td class="row-actions">
        <button class="btn btn-sm btn-mint" onclick="saveProject(${p.id})">Save</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteProject(${p.id})" aria-label="Delete project" title="Delete project">✕</button>
      </td>
    </tr>
  `).join("");
}

function saveProject(id){
  const p = projects.find(pr => pr.id === id);
  if(!p) return;
  const clientVal = document.getElementById("client-" + id).value.trim() || p.client;
  const titleVal = document.getElementById("title-" + id).value.trim() || p.title;
  const typeVal = document.getElementById("type-" + id).value;
  const progVal = Math.max(0, Math.min(100, parseInt(document.getElementById("prog-" + id).value, 10) || 0));
  const statusVal = document.getElementById("status-" + id).value;

  p.client = clientVal;
  p.title = titleVal;
  p.type = typeVal;
  p.progress = progVal;
  p.status = statusVal;

  // keep milestone "current" marker roughly in sync with progress
  const doneCount = Math.floor((progVal / 100) * p.milestones.length);
  p.milestones.forEach((m, i) => {
    m.done = i < doneCount;
    m.current = i === doneCount;
  });
  if(statusVal === "Completed"){
    p.progress = 100;
    p.milestones.forEach(m => { m.done = true; m.current = false; });
  }

  persistState();
  renderAdmin();
  showToast(`${p.title} updated — ${p.status}, ${p.progress}%`);
}

function deleteProject(id){
  const p = projects.find(pr => pr.id === id);
  if(!p) return;
  if(!confirm(`Delete "${p.title}" for ${p.client}? This can't be undone.`)) return;
  projects = projects.filter(pr => pr.id !== id);
  persistState();
  renderAdmin();
  showToast(`Deleted: ${p.title}`);
}

function addProject(e){
  e.preventDefault();
  const client = document.getElementById("newClientName").value.trim();
  const title = document.getElementById("newProjTitle").value.trim();
  const type = document.getElementById("newProjType").value;
  const status = document.getElementById("newProjStatus").value;
  const progress = Math.max(0, Math.min(100, parseInt(document.getElementById("newProjProgress").value, 10) || 0));

  projects.push({
    id: nextId++,
    client: client,
    title: title,
    type: type,
    progress: progress,
    status: status,
    milestones: [
      { name: "Kickoff", done: progress > 0, current: progress === 0 },
      { name: type === "Web Development" ? "Design" : "Rough cut", done: progress >= 40, current: progress > 0 && progress < 40 },
      { name: type === "Web Development" ? "Build" : "Color/Sound", done: progress >= 75, current: progress >= 40 && progress < 75 },
      { name: type === "Web Development" ? "Launch" : "Delivery", done: progress >= 100, current: progress >= 75 && progress < 100 }
    ]
  });

  persistState();

  const msg = document.getElementById("newProjMsg");
  msg.className = "form-msg show ok";
  msg.textContent = "Project added to the system.";
  e.target.reset();
  document.getElementById("newProjProgress").value = 0;
  showToast("New project added: " + title);
  setTimeout(() => switchAdminTab('manage'), 700);
}

/* ---------- Clients ---------- */

function renderAdminClients(){
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
    const safeName = name.replace(/'/g, "\\'");
    return `
      <div class="client-card">
        <div class="client-card-top">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <span class="mono" style="font-size:0.76rem; color:var(--text-faint);">${projList.length} project${projList.length === 1 ? "" : "s"} · ${activeCount} active · avg ${avg}%</span>
          </div>
          <div class="client-card-actions">
            <button class="btn btn-sm" onclick="filterAdminByClient('${safeName}')">View projects</button>
            <button class="btn btn-sm btn-ghost" onclick="deleteClient('${safeName}')" aria-label="Delete all projects for this client" title="Delete all projects for this client">✕</button>
          </div>
        </div>
        <div class="client-card-tags">
          ${projList.map(p => `<span class="badge ${statusBadgeClass(p.status)}">${escapeHtml(p.title)} · ${p.status}</span>`).join("")}
        </div>
      </div>`;
  }).join("");
}

function deleteClient(name){
  const count = projects.filter(p => p.client.trim() === name).length;
  if(!confirm(`Delete all ${count} project(s) for ${name}? This can't be undone.`)) return;
  projects = projects.filter(p => p.client.trim() !== name);
  persistState();
  renderAdminClients();
  showToast(`Removed all projects for ${name}`);
}
