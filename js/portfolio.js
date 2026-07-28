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
  if(m) return "https://www.youtube.com/embed/" + m[1];

  // Google Drive: /file/d/FILEID/... or open?id=FILEID, or already /preview
  m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
  m = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if(m) return "https://drive.google.com/file/d/" + m[1] + "/preview";

  // Unrecognized host — try the raw URL directly as a last resort
  return url;
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
    return '' +
    '<div class="vcard" ' + clickAttr + '>' +
      '<div class="vthumb ' + (v.orientation === "9:16" ? "vertical " : "") + escapeHtml(v.gradient) + '"><div class="vplay" role="button" aria-label="Play preview"></div><span class="vtime mono">' + escapeHtml(v.duration) + '</span></div>' +
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
