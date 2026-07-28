/* ==========================================================
   portfolio.js — renders the public "Video Editing" showcase
   grid from videoShowcase, and drives the admin Portfolio tab
   (add / edit / reorder-free list / delete / save)
   ========================================================== */

const GRADIENT_OPTIONS = ["grad-1", "grad-2", "grad-3", "grad-4", "grad-5", "grad-6"];

function renderVideoShowcasePublic(){
  const wrap169 = document.getElementById("videoShowcaseGrid169");
  const wrap916 = document.getElementById("videoShowcaseGrid916");
  if(!wrap169 || !wrap916) return;

  const cardHtml = v => `
    <div class="vcard">
      <div class="vthumb ${v.orientation === "9:16" ? "vertical " : ""}${escapeHtml(v.gradient)}"><div class="vplay" role="button" aria-label="Play preview"></div><span class="vtime mono">${escapeHtml(v.duration)}</span></div>
      <div class="vmeta"><h4>${escapeHtml(v.title)}</h4><span>${escapeHtml(v.tag)}</span></div>
    </div>
  `;

  wrap169.innerHTML = videoShowcase.filter(v => v.orientation !== "9:16").map(cardHtml).join("");
  wrap916.innerHTML = videoShowcase.filter(v => v.orientation === "9:16").map(cardHtml).join("");
}

/* ---------- Admin: Portfolio tab ---------- */

function renderPortfolioEditor(){
  const wrap = document.getElementById("portfolioEditorList");
  if(!wrap) return;
  wrap.innerHTML = videoShowcase.map((v, i) => `
    <div class="feature-row">
      <div class="feature-row-fields">
        <input type="text" class="row-text" data-reel-title="${i}" value="${escapeHtml(v.title)}" placeholder="Reel title">
        <input type="text" class="row-text" data-reel-tag="${i}" value="${escapeHtml(v.tag)}" placeholder="Category tag, e.g. COLOR GRADE · SOUND DESIGN">
        <input type="text" class="row-text" data-reel-duration="${i}" value="${escapeHtml(v.duration)}" placeholder="mm:ss" style="max-width:90px;">
        <select class="row-select" data-reel-gradient="${i}" style="max-width:110px;">
          ${GRADIENT_OPTIONS.map(g => `<option value="${g}" ${g === v.gradient ? "selected" : ""}>${g}</option>`).join("")}
        </select>
        <select class="row-select" data-reel-orientation="${i}" style="max-width:100px;">
          <option value="16:9" ${v.orientation === "16:9" ? "selected" : ""}>16:9</option>
          <option value="9:16" ${v.orientation === "9:16" ? "selected" : ""}>9:16</option>
        </select>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" onclick="removePortfolioRow(${i})" aria-label="Remove reel">✕</button>
    </div>
  `).join("");
}

function syncPortfolioFromDOM(){
  const titleInputs = document.querySelectorAll("[data-reel-title]");
  const tagInputs = document.querySelectorAll("[data-reel-tag]");
  const durationInputs = document.querySelectorAll("[data-reel-duration]");
  const gradientSelects = document.querySelectorAll("[data-reel-gradient]");
  const orientationSelects = document.querySelectorAll("[data-reel-orientation]");
  const reels = [];
  titleInputs.forEach((input, i) => {
    reels.push({
      title: input.value,
      tag: tagInputs[i] ? tagInputs[i].value : "",
      duration: durationInputs[i] ? durationInputs[i].value : "",
      gradient: gradientSelects[i] ? gradientSelects[i].value : "grad-1",
      orientation: orientationSelects[i] ? orientationSelects[i].value : "16:9"
    });
  });
  videoShowcase = reels;
}

function addPortfolioRow(){
  syncPortfolioFromDOM();
  videoShowcase.push({ title: "", tag: "", duration: "00:00", gradient: "grad-1", orientation: "16:9" });
  renderPortfolioEditor();
}

function removePortfolioRow(index){
  syncPortfolioFromDOM();
  videoShowcase.splice(index, 1);
  renderPortfolioEditor();
}

function savePortfolio(e){
  e.preventDefault();
  syncPortfolioFromDOM();
  // drop fully-empty rows
  videoShowcase = videoShowcase.filter(v => v.title.trim() || v.tag.trim());

  renderVideoShowcasePublic();
  renderPortfolioEditor();
  persistState();

  const msg = document.getElementById("portfolioMsg");
  if(msg){
    msg.className = "form-msg show ok";
    msg.textContent = "Portfolio updated.";
  }
  showToast("Portfolio saved");
}
