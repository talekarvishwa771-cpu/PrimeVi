/* ==========================================================
   portfolio.js — renders the public "Video Editing" showcase
   grid from videoShowcase, drives the admin Portfolio tab
   (add / edit / delete / save), and handles playing a reel's
   real video (YouTube or Google Drive link) in a modal.
   ========================================================== */

const GRADIENT_OPTIONS = ["grad-1", "grad-2", "grad-3", "grad-4", "grad-5", "grad-6"];

/* Turn a pasted YouTube or Google Drive link into an embeddable
   iframe URL. Returns the raw URL as a last-resort fallback if
   the link isn't recognized (some hosts embed fine directly,
   e.g. Vimeo, Loom). */
/* Portfolio reels now live in Firestore (siteData/portfolio) so every
   visitor sees the same content — not just the admin's own browser.
   On boot we render the local seed/cache instantly, then swap in the
   Firestore version once it arrives (avoids a blank flash). */
async function loadPortfolioFromFirestore(){
  try {
    const doc = await db.collection("siteData").doc("portfolio").get();
    if(doc.exists && Array.isArray(doc.data().reels)){
      videoShowcase = doc.data().reels;
      renderVideoShowcasePublic();
      renderPortfolioEditor(); // no-op if admin tab isn't open yet, harmless
    }
  } catch(err) {
    console.warn("Could not load portfolio from Firestore, using local data.", err);
  }
}

function toEmbedUrl(rawUrl){
  if(!rawUrl) return null;
  const url = rawUrl.trim();

  // YouTube: watch?v=, youtu.be/, shorts/, or already an /embed/ link
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if(m) return "https://www.youtube.com/embed/" + m[1] + "?autoplay=1&rel=0";

  // Google Drive: /file/d/FILEID/... or open?id=FILEID, or already /preview
  m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
  m = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/file/d/" + m[1] + "/preview";

  // Unrecognized host — try the raw URL directly as a last resort
  return url;
}

/* Derive a real thumbnail image from a pasted video link, so showcase
   cards show an actual preview frame instead of just a flat color.
   Falls back to null (caller keeps the gradient placeholder) when the
   host isn't recognized. */
function getVideoThumbnail(rawUrl){
  if(!rawUrl) return null;
  const url = rawUrl.trim();

  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if(m) return "https://img.youtube.com/vi/" + m[1] + "/hqdefault.jpg";

  m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w640";
  m = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w640";

  return null;
}

function openVideoModal(rawUrl, title, orientation){
  const embedUrl = toEmbedUrl(rawUrl);
  if(!embedUrl){
    showToast("No video link set for this reel");
    return;
  }
  const modal = document.getElementById("videoModal");
  const frameWrap = document.getElementById("videoModalFrameWrap");
  const caption = document.getElementById("videoModalCaption");

  frameWrap.className = "video-modal-frame-wrap" + (orientation === "9:16" ? " vertical" : "");
  frameWrap.innerHTML = '<iframe src="' + escapeHtml(embedUrl) + '" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
  caption.textContent = title || "";
  modal.classList.add("open");
}

function closeVideoModal(){
  const modal = document.getElementById("videoModal");
  const frameWrap = document.getElementById("videoModalFrameWrap");
  modal.classList.remove("open");
  frameWrap.innerHTML = ""; // stop playback
}

function renderVideoShowcasePublic(){
  const wrap169 = document.getElementById("videoShowcaseGrid169");
  const wrap916 = document.getElementById("videoShowcaseGrid916");
  if(!wrap169 || !wrap916) return;

  const cardHtml = v => {
    const hasVideo = !!(v.videoUrl && v.videoUrl.trim());
    const safeUrl = escapeHtml(v.videoUrl || "").replace(/'/g, "&#39;");
    const safeTitle = escapeHtml(v.title || "").replace(/'/g, "&#39;");
    const clickAttr = hasVideo
      ? 'onclick="openVideoModal(\'' + safeUrl + '\', \'' + safeTitle + '\', \'' + v.orientation + '\')" role="button" tabindex="0" style="cursor:pointer;"'
      : "";
    const thumb = hasVideo ? getVideoThumbnail(v.videoUrl) : null;
    const thumbImg = thumb ? '<img class="vthumb-img" src="' + escapeHtml(thumb) + '" alt="" loading="lazy" onerror="this.remove()">' : "";
    return '' +
    '<div class="vcard" ' + clickAttr + '>' +
      '<div class="vthumb ' + (v.orientation === "9:16" ? "vertical " : "") + escapeHtml(v.gradient) + '">' + thumbImg + '<div class="vplay" role="button" aria-label="Play preview"></div><span class="vtime mono">' + escapeHtml(v.duration) + '</span></div>' +
      '<div class="vmeta"><h4>' + escapeHtml(v.title) + '</h4><span>' + escapeHtml(v.tag) + '</span></div>' +
    '</div>';
  };

  wrap169.innerHTML = videoShowcase.filter(v => v.orientation !== "9:16").map(cardHtml).join("");
  wrap916.innerHTML = videoShowcase.filter(v => v.orientation === "9:16").map(cardHtml).join("");
}

/* ---------- Admin: Portfolio tab ---------- */

function renderPortfolioEditor(){
  const wrap = document.getElementById("portfolioEditorList");
  if(!wrap) return;
  wrap.innerHTML = videoShowcase.map((v, i) => `
    <div class="feature-row" style="flex-wrap:wrap;">
      <div class="feature-row-fields">
        <input type="text" class="row-text" data-reel-title="${i}" value="${escapeHtml(v.title)}" placeholder="Reel title">
        <input type="text" class="row-text" data-reel-tag="${i}" value="${escapeHtml(v.tag)}" placeholder="Category tag">
        <input type="text" class="row-text" data-reel-duration="${i}" value="${escapeHtml(v.duration)}" placeholder="mm:ss" style="max-width:90px;">
        <select class="row-select" data-reel-gradient="${i}" style="max-width:110px;">
          ${GRADIENT_OPTIONS.map(g => `<option value="${g}" ${g === v.gradient ? "selected" : ""}>${g}</option>`).join("")}
        </select>
        <select class="row-select" data-reel-orientation="${i}" style="max-width:100px;">
          <option value="16:9" ${v.orientation === "16:9" ? "selected" : ""}>16:9</option>
          <option value="9:16" ${v.orientation === "9:16" ? "selected" : ""}>9:16</option>
        </select>
      </div>
      <input type="text" class="row-text" data-reel-url="${i}" value="${escapeHtml(v.videoUrl || "")}" placeholder="YouTube or Google Drive link (leave blank for preview-only card)" style="width:100%;margin-top:8px;">
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
  const urlInputs = document.querySelectorAll("[data-reel-url]");
  const reels = [];
  titleInputs.forEach((input, i) => {
    reels.push({
      title: input.value,
      tag: tagInputs[i] ? tagInputs[i].value : "",
      duration: durationInputs[i] ? durationInputs[i].value : "",
      gradient: gradientSelects[i] ? gradientSelects[i].value : "grad-1",
      orientation: orientationSelects[i] ? orientationSelects[i].value : "16:9",
      videoUrl: urlInputs[i] ? urlInputs[i].value.trim() : ""
    });
  });
  videoShowcase = reels;
}

function addPortfolioRow(){
  syncPortfolioFromDOM();
  videoShowcase.push({ title: "", tag: "", duration: "00:00", gradient: "grad-1", orientation: "16:9", videoUrl: "" });
  renderPortfolioEditor();
}

function removePortfolioRow(index){
  syncPortfolioFromDOM();
  videoShowcase.splice(index, 1);
  renderPortfolioEditor();
}

/* ==========================================================
   Web development showcase — same pattern as the video reels
   above, but for the "Web Development" cards. Stored separately
   in Firestore (siteData/webPortfolio) and editable in the admin
   Portfolio tab. Clicking a card opens the project's real URL.
   ========================================================== */

async function loadWebPortfolioFromFirestore(){
  try {
    const doc = await db.collection("siteData").doc("webPortfolio").get();
    if(doc.exists && Array.isArray(doc.data().items)){
      webShowcase = doc.data().items;
      renderWebShowcasePublic();
      renderWebPortfolioEditor(); // no-op if admin tab isn't open yet, harmless
    }
  } catch(err) {
    console.warn("Could not load web portfolio from Firestore, using local data.", err);
  }
}

function openWebLink(link){
  if(!link || !link.trim()){
    showToast("No link set for this project");
    return;
  }
  window.open(link.trim(), "_blank", "noopener,noreferrer");
}

function renderWebShowcasePublic(){
  const wrap = document.getElementById("webShowcaseGrid");
  if(!wrap) return;

  if(webShowcase.length === 0){
    wrap.innerHTML = `<p style="color:var(--text-dim); font-size:0.9rem;">No web projects added yet.</p>`;
    return;
  }

  wrap.innerHTML = webShowcase.map((w, i) => {
    const hasLink = !!(w.link && w.link.trim());
    const safeLink = escapeHtml(w.link || "").replace(/'/g, "&#39;");
    const clickAttr = hasLink
      ? 'onclick="openWebLink(\'' + safeLink + '\')" role="button" tabindex="0" style="cursor:pointer;"'
      : "";
    const tags = (w.tags || "").split(",").map(t => t.trim()).filter(Boolean);
    return '' +
    '<div class="card" ' + clickAttr + '>' +
      '<div class="card-top"><span class="card-idx">WEB / ' + String(i + 1).padStart(2, "0") + '</span></div>' +
      '<h3>' + escapeHtml(w.title) + '</h3>' +
      '<p class="desc">' + escapeHtml(w.desc || "") + '</p>' +
      '<div class="tags">' + tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join("") + '</div>' +
      (hasLink
        ? '<a class="preview-link" href="' + escapeHtml(w.link) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">▸ View live preview</a>'
        : '<span class="preview-link" style="opacity:0.5;">▸ No link set</span>') +
    '</div>';
  }).join("");
}

/* ---------- Admin: Web Portfolio editor ---------- */

function renderWebPortfolioEditor(){
  const wrap = document.getElementById("webPortfolioEditorList");
  if(!wrap) return;
  wrap.innerHTML = webShowcase.map((w, i) => `
    <div class="feature-row" style="flex-wrap:wrap;">
      <div class="feature-row-fields">
        <input type="text" class="row-text" data-web-title="${i}" value="${escapeHtml(w.title)}" placeholder="Project title">
        <input type="text" class="row-text" data-web-desc="${i}" value="${escapeHtml(w.desc || "")}" placeholder="Short description">
      </div>
      <input type="text" class="row-text" data-web-tags="${i}" value="${escapeHtml(w.tags || "")}" placeholder="Tech tags, comma separated (e.g. Next.js, Tailwind)" style="width:100%;margin-top:8px;">
      <input type="text" class="row-text" data-web-link="${i}" value="${escapeHtml(w.link || "")}" placeholder="Live site URL (opens when the card is clicked)" style="width:100%;margin-top:8px;">
      <button type="button" class="btn btn-sm btn-ghost" onclick="removeWebPortfolioRow(${i})" aria-label="Remove project">✕</button>
    </div>
  `).join("");
}

function syncWebPortfolioFromDOM(){
  const titleInputs = document.querySelectorAll("[data-web-title]");
  const descInputs = document.querySelectorAll("[data-web-desc]");
  const tagsInputs = document.querySelectorAll("[data-web-tags]");
  const linkInputs = document.querySelectorAll("[data-web-link]");
  const items = [];
  titleInputs.forEach((input, i) => {
    items.push({
      title: input.value,
      desc: descInputs[i] ? descInputs[i].value : "",
      tags: tagsInputs[i] ? tagsInputs[i].value : "",
      link: linkInputs[i] ? linkInputs[i].value.trim() : ""
    });
  });
  webShowcase = items;
}

function addWebPortfolioRow(){
  syncWebPortfolioFromDOM();
  webShowcase.push({ title: "", desc: "", tags: "", link: "" });
  renderWebPortfolioEditor();
}

function removeWebPortfolioRow(index){
  syncWebPortfolioFromDOM();
  webShowcase.splice(index, 1);
  renderWebPortfolioEditor();
}

async function saveWebPortfolio(e){
  e.preventDefault();
  syncWebPortfolioFromDOM();
  // drop fully-empty rows
  webShowcase = webShowcase.filter(w => w.title.trim() || w.desc.trim());

  const msg = document.getElementById("webPortfolioMsg");
  if(msg){
    msg.className = "form-msg show";
    msg.textContent = "Saving...";
  }

  try {
    await db.collection("siteData").doc("webPortfolio").set({ items: webShowcase });

    renderWebShowcasePublic();
    renderWebPortfolioEditor();

    if(msg){
      msg.className = "form-msg show ok";
      msg.textContent = "Web portfolio saved.";
    }
    showToast("Web portfolio saved");
  } catch(err) {
    console.error("Firestore save failed", err);
    if(msg){
      msg.className = "form-msg show err";
      msg.textContent = "Couldn't save — check your connection or Firestore permissions.";
    }
    showToast("Save failed");
  }
}

async function savePortfolio(e){
  e.preventDefault();
  syncPortfolioFromDOM();
  // drop fully-empty rows
  videoShowcase = videoShowcase.filter(v => v.title.trim() || v.tag.trim());

  const msg = document.getElementById("portfolioMsg");
  if(msg){
    msg.className = "form-msg show";
    msg.textContent = "Saving...";
  }

  try {
    await db.collection("siteData").doc("portfolio").set({ reels: videoShowcase });

    renderVideoShowcasePublic();
    renderPortfolioEditor();

    if(msg){
      msg.className = "form-msg show ok";
      msg.textContent = "Portfolio saved.";
    }
    showToast("Portfolio saved");
  } catch(err) {
    console.error("Firestore save failed", err);
    if(msg){
      msg.className = "form-msg show err";
      msg.textContent = "Couldn't save — check your connection or Firestore permissions.";
    }
    showToast("Save failed");
  }
}
