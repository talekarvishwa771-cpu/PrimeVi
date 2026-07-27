/* ==========================================================
   settings.js — applies siteSettings across the site (title,
   meta tags, brand name, footer contact, WhatsApp number),
   renders the public "Services & Add-ons" section, and drives
   the admin Settings tab (form + dynamic feature list editor)
   ========================================================== */

function applySiteSettings(){
  // <title> and meta tags
  document.title = siteSettings.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc) metaDesc.setAttribute("content", siteSettings.description);
  const metaKw = document.querySelector('meta[name="keywords"]');
  if(metaKw) metaKw.setAttribute("content", siteSettings.keywords);

  // Nav brand — split on "/" so the accent slash still works when
  // the default name is used, otherwise show the name plainly.
  const parts = siteSettings.siteName.split("/");
  const brandMain = document.getElementById("brandNameMain");
  const brandSlash = document.getElementById("brandSlash");
  const brandSecond = document.getElementById("brandNameSecond");
  if(parts.length === 2){
    brandMain.textContent = parts[0];
    brandSlash.style.display = "";
    brandSlash.textContent = "/";
    brandSecond.textContent = parts[1];
  } else {
    brandMain.textContent = siteSettings.siteName;
    brandSlash.style.display = "none";
    brandSecond.textContent = "";
  }

  // Footer contact info
  const footerContact = document.getElementById("footerContact");
  if(footerContact){
    footerContact.innerHTML = `
      <a href="mailto:${escapeHtml(siteSettings.email)}">${escapeHtml(siteSettings.email)}</a>
      <span aria-hidden="true"> · </span>
      <a href="tel:${escapeHtml(siteSettings.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(siteSettings.phone)}</a>
    `;
  }

  // WhatsApp float button — reuse the phone number, digits only
  const waBtn = document.getElementById("waFloatBtn");
  if(waBtn){
    const digits = siteSettings.phone.replace(/[^\d]/g, "");
    waBtn.href = `https://wa.me/${digits}?text=${encodeURIComponent("Hi " + siteSettings.siteName + ", I'd like to talk about a project.")}`;
  }
}

function renderFeaturesPublic(){
  const wrap = document.getElementById("featuresList");
  if(!wrap) return;
  wrap.innerHTML = siteSettings.features.map(f => `
    <div class="feature-card">
      <h4>${escapeHtml(f.name)}</h4>
      <p>${escapeHtml(f.description)}</p>
    </div>
  `).join("");
}

/* ---------- Admin: Settings tab ---------- */

function renderSettingsForm(){
  document.getElementById("setTitle").value = siteSettings.title;
  document.getElementById("setSiteName").value = siteSettings.siteName;
  document.getElementById("setDescription").value = siteSettings.description;
  document.getElementById("setKeywords").value = siteSettings.keywords;
  document.getElementById("setPhone").value = siteSettings.phone;
  document.getElementById("setEmail").value = siteSettings.email;
  renderFeatureEditor();
}

function renderFeatureEditor(){
  const wrap = document.getElementById("featureEditorList");
  wrap.innerHTML = siteSettings.features.map((f, i) => `
    <div class="feature-row">
      <div class="feature-row-fields">
        <input type="text" class="row-text" data-feature-name="${i}" value="${escapeHtml(f.name)}" placeholder="Feature or add-on name">
        <input type="text" class="row-text" data-feature-desc="${i}" value="${escapeHtml(f.description)}" placeholder="Short description">
      </div>
      <button type="button" class="btn btn-sm btn-ghost" onclick="removeFeatureRow(${i})" aria-label="Remove feature">✕</button>
    </div>
  `).join("");
}

function syncFeaturesFromDOM(){
  const nameInputs = document.querySelectorAll("[data-feature-name]");
  const descInputs = document.querySelectorAll("[data-feature-desc]");
  const features = [];
  nameInputs.forEach((input, i) => {
    features.push({ name: input.value, description: descInputs[i] ? descInputs[i].value : "" });
  });
  siteSettings.features = features;
}

function addFeatureRow(){
  syncFeaturesFromDOM();
  siteSettings.features.push({ name: "", description: "" });
  renderFeatureEditor();
}

function removeFeatureRow(index){
  syncFeaturesFromDOM();
  siteSettings.features.splice(index, 1);
  renderFeatureEditor();
}

function saveSettings(e){
  e.preventDefault();

  // pull feature rows currently in the DOM before they get wiped by a re-render
  const nameInputs = document.querySelectorAll("[data-feature-name]");
  const descInputs = document.querySelectorAll("[data-feature-desc]");
  const features = [];
  nameInputs.forEach((input, i) => {
    const name = input.value.trim();
    const description = descInputs[i] ? descInputs[i].value.trim() : "";
    if(name || description) features.push({ name, description });
  });

  siteSettings = {
    title: document.getElementById("setTitle").value.trim() || siteSettings.title,
    siteName: document.getElementById("setSiteName").value.trim() || siteSettings.siteName,
    description: document.getElementById("setDescription").value.trim(),
    keywords: document.getElementById("setKeywords").value.trim(),
    phone: document.getElementById("setPhone").value.trim(),
    email: document.getElementById("setEmail").value.trim(),
    features: features
  };

  applySiteSettings();
  renderFeaturesPublic();
  persistState();

  const msg = document.getElementById("settingsMsg");
  msg.className = "form-msg show ok";
  msg.textContent = "Site settings updated.";
  showToast("Site settings saved");
}
