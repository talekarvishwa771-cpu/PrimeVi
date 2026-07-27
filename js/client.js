/* ==========================================================
   client.js — client portal: active projects list + brief submission
   ========================================================== */

function switchClientTab(tab){
  document.querySelectorAll("#page-client .portal-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("#page-client .tabpane").forEach(p => p.classList.remove("active"));
  document.getElementById("clientTab-" + tab).classList.add("active");
}

function statusBadgeClass(status){
  switch(status){
    case "In Progress": return "badge-progress";
    case "In Review": return "badge-review";
    case "Completed": return "badge-complete";
    case "On Hold": return "badge-hold";
    default: return "badge-submitted";
  }
}

function renderClient(){
  document.getElementById("clientGreetName").textContent = "Welcome back, " + (currentUser ? currentUser.name : "there");
  const mine = projects.filter(p => p.client.toLowerCase() === (currentUser ? currentUser.name.toLowerCase() : ""));
  const list = document.getElementById("clientProjectsList");

  if(mine.length === 0){
    list.innerHTML = `
      <div class="empty-state">
        <h3>No active projects yet</h3>
        <p>Once your brief is accepted, tracked projects will show up here with live progress. Try signing in as "Fernweg Travel Co." to see sample project data, or submit a new brief to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = mine.map(p => `
    <div class="proj-card">
      <div class="proj-top">
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="proj-type">${p.type.toUpperCase()}</div>
        </div>
        <span class="badge ${statusBadgeClass(p.status)}">${p.status}</span>
      </div>
      <div class="scrub-wrap">
        <div class="scrub-labels"><span>PROGRESS</span><span>${p.progress}%</span></div>
        <div class="scrub">
          <div class="scrub-fill" style="width:${p.progress}%;"></div>
          <div class="scrub-head" style="left:${p.progress}%;"></div>
        </div>
      </div>
      <div class="milestones">
        ${p.milestones.map(m => `
          <div class="mstep ${m.done ? 'done' : ''} ${m.current ? 'current' : ''}">
            <div class="mdot"></div>
            <span>${escapeHtml(m.name)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function submitBrief(e){
  e.preventDefault();
  const title = document.getElementById("briefTitle").value.trim();
  const type = document.getElementById("briefType").value;

  projects.push({
    id: nextId++,
    client: currentUser ? currentUser.name : "Unknown client",
    title: title,
    type: type,
    progress: 0,
    status: "Submitted",
    milestones: [
      { name: "Kickoff", done: false, current: true },
      { name: type === "Web Development" ? "Design" : "Rough cut", done: false },
      { name: type === "Web Development" ? "Build" : "Color/Sound", done: false },
      { name: type === "Web Development" ? "Launch" : "Delivery", done: false }
    ]
  });

  persistState();

  const msg = document.getElementById("briefMsg");
  msg.className = "form-msg show ok";
  msg.textContent = "Brief submitted. Your project now appears under Active Projects.";
  e.target.reset();
  renderClient();
  showToast("Brief submitted to the Splice/Stack team");
  setTimeout(() => switchClientTab('active'), 700);
}
