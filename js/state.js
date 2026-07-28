/* ==========================================================
   state.js — in-memory application state (no backend / storage;
   resets on page refresh)
   ========================================================== */

let projects = [];
let allUsers = [];
let selectedRole = "client";
let currentUser = null;

/* ---------- Persistence (localStorage) ----------
   Everything above is the seeded demo data. If a saved copy exists
   in the browser, it overwrites the seed data on load so admin
   changes (projects, settings) survive a page refresh. */
const STORAGE_KEY = "spliceStack.data.v1";

function persistState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ siteSettings, videoShowcase, webShowcase }));
  } catch(e){
    console.warn("Could not save to localStorage", e);
  }
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data.siteSettings) siteSettings = data.siteSettings;
    if(Array.isArray(data.videoShowcase)) videoShowcase = data.videoShowcase;
    if(Array.isArray(data.webShowcase)) webShowcase = data.webShowcase;
  } catch(e){
    console.warn("Could not load saved data, using seed data", e);
  }
}

function resetDemoData(){
  if(!confirm("Reset all projects and settings back to the original demo data? This can't be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* Video editing showcase reels, shown on the public landing page
   and editable from the admin Portfolio tab. In-memory only —
   persisted the same way as siteSettings. */
let videoShowcase = [
  { title: "Aperture — Brand Film", tag: "COLOR GRADE · SOUND DESIGN", duration: "01:42", gradient: "grad-1", orientation: "16:9", videoUrl: "" },
  { title: "Tidal — Product Launch", tag: "MOTION GRAPHICS · SOCIAL CUT", duration: "00:38", gradient: "grad-2", orientation: "9:16", videoUrl: "" },
  { title: "Groundwork — Documentary", tag: "LONG-FORM EDIT", duration: "04:12", gradient: "grad-3", orientation: "16:9", videoUrl: "" },
  { title: "Pulse — Event Recap", tag: "MULTI-CAM EDIT", duration: "00:22", gradient: "grad-4", orientation: "9:16", videoUrl: "" },
  { title: "Northlight — Testimonial Series", tag: "INTERVIEW EDIT", duration: "02:05", gradient: "grad-5", orientation: "16:9", videoUrl: "" },
  { title: "Ferrous — Explainer", tag: "2D ANIMATION", duration: "00:55", gradient: "grad-6", orientation: "9:16", videoUrl: "" }
];

/* Web development showcase cards, shown on the public landing page
   and editable from the admin Portfolio tab. Clicking a card (when a
   link is set) opens that project's live site in a new tab. */
let webShowcase = [
  { title: "Fernweg Travel Co.", desc: "Headless booking flow with real-time availability, built to handle traffic spikes during flash sales.", tags: "Next.js, Tailwind, Stripe, Supabase", link: "" },
  { title: "Northbound Analytics", desc: "A data dashboard rebuilt from a legacy jQuery app into a fast, componentized SPA with role-based access.", tags: "React, Node.js, PostgreSQL, D3.js", link: "" },
  { title: "Kiln & Co. Ceramics", desc: "Storefront and inventory system for a small-batch pottery studio, with a custom order-tracking portal.", tags: "Shopify Hydrogen, GraphQL, Vite", link: "" },
  { title: "Basecamp Climbing Gym", desc: "Membership and class-booking platform with waitlists, waivers, and instructor scheduling.", tags: "Vue 3, Express, MongoDB", link: "" },
  { title: "Verdant Capital", desc: "Investor-facing portal with document rooms, e-signature workflow, and audit-logged access.", tags: "Next.js, Prisma, Auth0", link: "" },
  { title: "Lumen Fitness App", desc: "Progressive web app for workout tracking with offline mode and wearable-device sync.", tags: "React Native, Firebase, Tailwind", link: "" }
];

/* Site-wide settings, editable from the admin Settings tab.
   Drives the page <title>, meta tags, nav brand, footer contact
   info, the WhatsApp button number, and the public "Services &
   Add-ons" section. In-memory only — resets on refresh. */
let siteSettings = {
  siteName: "Splice/Stack",
  title: "Splice/Stack — Web Development & Video Editing Studio",
  description: "Splice/Stack is a web development and video editing studio. We build production-ready websites and cut brand films, social content, and documentaries.",
  keywords: "web development, video editing, web design, video production, brand films, agency",
  phone: "+918767121059",
  email: "hello@primevisuals.studio",
  features: [
    { name: "Rush Delivery", description: "48-hour turnaround available for urgent edits and quick-fix builds." },
    { name: "SEO Optimization", description: "On-page SEO structure baked into every web build, not bolted on after." },
    { name: "Motion Graphics Add-on", description: "Custom animated titles and lower-thirds for any video project." },
    { name: "Ongoing Maintenance", description: "Monthly retainer covering updates, backups, and uptime monitoring." }
  ]
};
