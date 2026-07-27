/* ==========================================================
   state.js — in-memory application state (no backend / storage;
   resets on page refresh)
   ========================================================== */

let projects = [
  {
    id: 1,
    client: "Fernweg Travel Co.",
    title: "Booking flow rebuild",
    type: "Web Development",
    progress: 70,
    status: "In Progress",
    milestones: [
      { name: "Kickoff", done: true },
      { name: "Design", done: true },
      { name: "Build", done: false, current: true },
      { name: "Launch", done: false }
    ]
  },
  {
    id: 2,
    client: "Fernweg Travel Co.",
    title: "Summer campaign recap video",
    type: "Video Editing",
    progress: 40,
    status: "In Review",
    milestones: [
      { name: "Footage sort", done: true },
      { name: "Rough cut", done: true, current: true },
      { name: "Color/Sound", done: false },
      { name: "Final delivery", done: false }
    ]
  },
  {
    id: 3,
    client: "Northbound Analytics",
    title: "Dashboard v2 rebuild",
    type: "Web Development",
    progress: 100,
    status: "Completed",
    milestones: [
      { name: "Kickoff", done: true },
      { name: "Design", done: true },
      { name: "Build", done: true },
      { name: "Launch", done: true }
    ]
  },
  {
    id: 4,
    client: "Kiln & Co. Ceramics",
    title: "Storefront relaunch",
    type: "Web Development",
    progress: 15,
    status: "On Hold",
    milestones: [
      { name: "Kickoff", done: true, current: true },
      { name: "Design", done: false },
      { name: "Build", done: false },
      { name: "Launch", done: false }
    ]
  },
  {
    id: 5,
    client: "Aperture Films",
    title: "Brand documentary edit",
    type: "Video Editing",
    progress: 55,
    status: "In Progress",
    milestones: [
      { name: "Footage sort", done: true },
      { name: "Rough cut", done: true, current: true },
      { name: "Color/Sound", done: false },
      { name: "Final delivery", done: false }
    ]
  }
];
let nextId = 6;
let selectedRole = "client";
let currentUser = null; // { name, role }

/* ---------- Persistence (localStorage) ----------
   Everything above is the seeded demo data. If a saved copy exists
   in the browser, it overwrites the seed data on load so admin
   changes (projects, settings) survive a page refresh. */
const STORAGE_KEY = "spliceStack.data.v1";

function persistState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, nextId, siteSettings }));
  } catch(e){
    console.warn("Could not save to localStorage", e);
  }
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(Array.isArray(data.projects)) projects = data.projects;
    if(typeof data.nextId === "number") nextId = data.nextId;
    if(data.siteSettings) siteSettings = data.siteSettings;
  } catch(e){
    console.warn("Could not load saved data, using seed data", e);
  }
}

function resetDemoData(){
  if(!confirm("Reset all projects and settings back to the original demo data? This can't be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* Site-wide settings, editable from the admin Settings tab.
   Drives the page <title>, meta tags, nav brand, footer contact
   info, the WhatsApp button number, and the public "Services &
   Add-ons" section. In-memory only — resets on refresh. */
let siteSettings = {
  siteName: "Splice/Stack",
  title: "Splice/Stack — Web Development & Video Editing Studio",
  description: "Splice/Stack is a web development and video editing studio. We build production-ready websites and cut brand films, social content, and documentaries.",
  keywords: "web development, video editing, web design, video production, brand films, agency",
  phone: "+1 555 123 4567",
  email: "hello@splicestack.studio",
  features: [
    { name: "Rush Delivery", description: "48-hour turnaround available for urgent edits and quick-fix builds." },
    { name: "SEO Optimization", description: "On-page SEO structure baked into every web build, not bolted on after." },
    { name: "Motion Graphics Add-on", description: "Custom animated titles and lower-thirds for any video project." },
    { name: "Ongoing Maintenance", description: "Monthly retainer covering updates, backups, and uptime monitoring." }
  ]
};
