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
  const mine = currentUser
    ? projects.filter(p => p.clientUid === currentUser.uid || p.client.toLowerCase() === currentUser.name.toLowerCase())
    : [];
  const list = document.getElementById("clientProjectsList");

  if(mine.length === 0){
    list.innerHTML = `
      <div class="empty-state">
        <h3>No active projects yet</h3>
        <p>Once your brief is accepted, tracked projects will show up here with live progress. Submit a new brief to get started.</p>
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
      <div class="field" style="margin-top:14px;">
        <label>Raw footage / asset link</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="row-text" style="flex:1;" id="footage-${p.id}" value="${escapeHtml(p.footageLink || "")}" placeholder="Paste a Google Drive, YouTube, or WeTransfer link">
          <button type="button" class="btn btn-sm btn-mint" onclick="saveFootageLink('${p.id}')">Save</button>
        </div>
      </div>
    </div>
  `).join("");
}

async function saveFootageLink(id){
  const val = document.getElementById("footage-" + id).value.trim();
  try{
    await updateProjectFields(id, { footageLink: val });
    showToast("Link saved");
  } catch(err){
    console.error(err);
    showToast("Could not save link — check your connection");
  }
}

async function submitBrief(e){
  e.preventDefault();
  const title = document.getElementById("briefTitle").value.trim();
  const type = document.getElementById("briefType").value;
  const footageLink = document.getElementById("briefFootage").value.trim();
  const progress = 0;

  const data = {
    client: currentUser ? currentUser.name : "Unknown client",
    clientUid: currentUser ? currentUser.uid : null,
    title, type, progress,
    status: "Submitted",
    earning: 0,
    footageLink,
    milestones: defaultMilestones(type, progress)
  };

  try{
    await createProject(data);
    const msg = document.getElementById("briefMsg");
    msg.className = "form-msg show ok";
    msg.textContent = "Brief submitted. Your project now appears under Active Projects.";
    e.target.reset();
    renderClient();
    showToast("Brief submitted to the team");
    setTimeout(() => switchClientTab('active'), 700);
  } catch(err){
    console.error(err);
    showToast("Could not submit brief — check your connection");
  }
}
