/* ============================================================
   SwiftCV — free ATS-friendly resume + cover letter builder
   100% client-side. No servers, no APIs, no tracking.
   ============================================================ */
"use strict";

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const PDFJS_LIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* ---------------- state ---------------- */
const blankExp  = () => ({ title: "", company: "", location: "", start: "", end: "", present: false, bullets: "" });
const blankProj = () => ({ title: "", tech: "", bullets: "" });
const blankEdu  = () => ({ degree: "", school: "", year: "", location: "" });

const blankState = () => ({
  template: "professional",
  personal: { name: "", title: "", email: "", phone: "", location: "", linkedin: "", website: "" },
  summary: "",
  experience: [blankExp()],
  projects: [blankProj()],
  education: [blankEdu()],
  skills: ""
});
let state = blankState();

let cover = {
  name: "", email: "", phone: "", location: "",
  date: new Date().toISOString().slice(0, 10),
  recipient: "", company: "", jobTitle: "",
  para1: "", para2: "", para3: ""
};

const LS_KEY = "swiftcv-resume-v2";
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ state, cover })); } catch (e) { /* private mode */ }
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY) || localStorage.getItem("swiftcv-resume-v1");
    if (!raw) return;
    const s = JSON.parse(raw);
    const st = s.state || s; // v1 had no wrapper
    if (st && typeof st === "object") {
      state = Object.assign(blankState(), st);
      state.personal = Object.assign(blankState().personal, st.personal || {});
      if (!Array.isArray(state.experience) || !state.experience.length) state.experience = [blankExp()];
      if (!Array.isArray(state.projects)   || !state.projects.length)   state.projects   = [blankProj()];
      if (!Array.isArray(state.education)  || !state.education.length)  state.education  = [blankEdu()];
    }
    if (s.cover && typeof s.cover === "object") cover = Object.assign(cover, s.cover);
  } catch (e) { /* ignore corrupt data */ }
}

/* ---------------- sample data ---------------- */
const SAMPLE = {
  template: "professional",
  personal: {
    name: "Ahmed Khan",
    title: "Digital Marketing Specialist",
    email: "ahmed.khan@email.com",
    phone: "+92 300 1234567",
    location: "Lahore, Pakistan",
    linkedin: "linkedin.com/in/ahmedkhan",
    website: ""
  },
  summary: "Results-driven digital marketer with 4+ years of experience growing e-commerce brands through SEO, Google Ads, and email marketing. Increased organic traffic 180% and cut cost-per-acquisition by 35% across managed accounts.",
  experience: [
    {
      title: "Digital Marketing Specialist", company: "BrightCart", location: "Lahore",
      start: "Jan 2022", end: "", present: true,
      bullets: "Grew organic traffic 180% in 18 months through technical SEO and content strategy\nManaged Rs. 2.5M annual Google Ads budget at 4.2x ROAS\nBuilt email flows that lifted repeat purchase rate from 12% to 21%"
    },
    {
      title: "Marketing Executive", company: "NovaTech Solutions", location: "Lahore",
      start: "Jun 2020", end: "Dec 2021", present: false,
      bullets: "Ran Facebook and Instagram campaigns reaching 1.2M users per quarter\nWrote 60+ SEO articles ranking on page 1 for target keywords\nCoordinated with designers to launch 3 product landing pages"
    }
  ],
  projects: [
    {
      title: "SEO Audit Toolkit", tech: "Python, BeautifulSoup, Streamlit",
      bullets: "Built an automated crawler that audits 500+ pages for broken links, missing meta tags, and slow assets\nCut manual audit time from 6 hours to 20 minutes per client site"
    }
  ],
  education: [
    { degree: "BBA, Marketing", school: "University of the Punjab", year: "2020", location: "Lahore" }
  ],
  skills: "SEO, Google Ads, Meta Ads, Email Marketing, Google Analytics, Content Strategy, Copywriting"
};

/* ---------------- form building ---------------- */
function expEntryHTML(exp, i) {
  return `
  <div class="entry">
    <button type="button" class="entry-remove" data-exp-del="${i}">Remove</button>
    <h4>Job ${i + 1}</h4>
    <div class="grid2">
      <label>Job title<input data-exp-f="title" data-i="${i}" value="${esc(exp.title)}" placeholder="Digital Marketing Specialist"></label>
      <label>Company<input data-exp-f="company" data-i="${i}" value="${esc(exp.company)}" placeholder="BrightCart"></label>
      <label>Location<input data-exp-f="location" data-i="${i}" value="${esc(exp.location)}" placeholder="Lahore"></label>
      <label>Start<input data-exp-f="start" data-i="${i}" value="${esc(exp.start)}" placeholder="Jan 2022"></label>
      <label>End<input data-exp-f="end" data-i="${i}" value="${esc(exp.end)}" placeholder="Dec 2023" ${exp.present ? "disabled" : ""}></label>
      <label>&nbsp;</label>
    </div>
    <label class="present-row"><input type="checkbox" data-exp-f="present" data-i="${i}" ${exp.present ? "checked" : ""}> I currently work here</label>
    <label>Achievements — one per line, start with a strong verb
      <textarea data-exp-f="bullets" data-i="${i}" rows="4" placeholder="Grew organic traffic 180% in 18 months&#10;Managed Rs. 2M ad budget at 4x ROAS">${esc(exp.bullets)}</textarea>
    </label>
  </div>`;
}

function projEntryHTML(p, i) {
  return `
  <div class="entry">
    <button type="button" class="entry-remove" data-proj-del="${i}">Remove</button>
    <h4>Project ${i + 1}</h4>
    <div class="grid2">
      <label class="span2">Project title<input data-proj-f="title" data-i="${i}" value="${esc(p.title)}" placeholder="SEO Audit Toolkit"></label>
      <label class="span2">Tech stack <span class="opt">(optional)</span><input data-proj-f="tech" data-i="${i}" value="${esc(p.tech)}" placeholder="Python, Streamlit"></label>
    </div>
    <label>What you built &amp; the impact — one per line
      <textarea data-proj-f="bullets" data-i="${i}" rows="3" placeholder="Built an automated crawler that audits 500+ pages&#10;Cut manual audit time from 6 hours to 20 minutes">${esc(p.bullets)}</textarea>
    </label>
  </div>`;
}

function eduEntryHTML(edu, i) {
  return `
  <div class="entry">
    <button type="button" class="entry-remove" data-edu-del="${i}">Remove</button>
    <h4>Education ${i + 1}</h4>
    <div class="grid2">
      <label>Degree<input data-edu-f="degree" data-i="${i}" value="${esc(edu.degree)}" placeholder="BBA, Marketing"></label>
      <label>School / University<input data-edu-f="school" data-i="${i}" value="${esc(edu.school)}" placeholder="University of the Punjab"></label>
      <label>Year<input data-edu-f="year" data-i="${i}" value="${esc(edu.year)}" placeholder="2020"></label>
      <label>Location<input data-edu-f="location" data-i="${i}" value="${esc(edu.location)}" placeholder="Lahore"></label>
    </div>
  </div>`;
}

function renderEntries() {
  $("#exp-list").innerHTML  = state.experience.map(expEntryHTML).join("");
  $("#proj-list").innerHTML = state.projects.map(projEntryHTML).join("");
  $("#edu-list").innerHTML  = state.education.map(eduEntryHTML).join("");
}

function fillSimpleFields() {
  $$("#resume-form [data-f]").forEach((el) => {
    const path = el.getAttribute("data-f").split(".");
    let v = state;
    for (const p of path) v = v ? v[p] : "";
    el.value = v == null ? "" : v;
  });
  $$(".tpl-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tpl === state.template));
}

function fillCoverFields() {
  $$("#cover-letter [data-c]").forEach((el) => {
    el.value = cover[el.getAttribute("data-c")] || "";
  });
}

/* ---------------- resume preview ---------------- */
function contactLine(p) {
  const bits = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).map(esc);
  return bits.join(" &nbsp;•&nbsp; ");
}

function renderPreview() {
  const sheet = $("#resume-sheet");
  const p = state.personal;
  const hasAny = p.name || p.title || state.summary ||
    state.experience.some(e => e.title || e.company) ||
    state.projects.some(e => e.title) ||
    state.education.some(e => e.degree || e.school) || state.skills;

  sheet.className = "sheet tpl-" + state.template;

  if (!hasAny) {
    sheet.innerHTML = `<div class="sheet-empty">Your resume preview appears here.<br>Fill the form, import a PDF, or <a href="#" id="empty-sample">load the sample resume</a> to see it in action.</div>`;
    const l = $("#empty-sample");
    if (l) l.addEventListener("click", (e) => { e.preventDefault(); loadSample(); });
    return;
  }

  let html = "";
  html += `<div class="r-name">${esc(p.name) || "Your Name"}</div>`;
  if (p.title) html += `<div class="r-title">${esc(p.title)}</div>`;
  const cl = contactLine(p);
  if (cl) html += `<div class="r-contact">${cl}</div>`;

  if (state.summary.trim()) {
    html += `<h2 class="r-sec-head">Professional Summary</h2><p>${esc(state.summary).replace(/\n/g, "<br>")}</p>`;
  }

  const exps = state.experience.filter(e => e.title || e.company || e.bullets.trim());
  if (exps.length) {
    html += `<h2 class="r-sec-head">Work Experience</h2>`;
    for (const e of exps) {
      const dates = [e.start, e.present ? "Present" : e.end].filter(Boolean).join(" – ");
      html += `<div class="r-item">
        <div class="r-item-head"><span>${esc(e.title)}${e.company ? " — " + esc(e.company) : ""}</span>${dates ? `<span class="r-dates">${esc(dates)}</span>` : ""}</div>
        ${e.location ? `<div class="r-item-sub">${esc(e.location)}</div>` : ""}
        ${e.bullets.trim() ? `<ul>${e.bullets.split("\n").map(b => b.trim()).filter(Boolean).map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
  }

  const projs = state.projects.filter(e => e.title || e.bullets.trim());
  if (projs.length) {
    html += `<h2 class="r-sec-head">Projects</h2>`;
    for (const e of projs) {
      html += `<div class="r-item">
        <div class="r-item-head"><span>${esc(e.title)}</span>${e.tech ? `<span class="r-dates">${esc(e.tech)}</span>` : ""}</div>
        ${e.bullets.trim() ? `<ul>${e.bullets.split("\n").map(b => b.trim()).filter(Boolean).map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
  }

  const edus = state.education.filter(e => e.degree || e.school);
  if (edus.length) {
    html += `<h2 class="r-sec-head">Education</h2>`;
    for (const e of edus) {
      html += `<div class="r-item">
        <div class="r-item-head"><span>${esc(e.degree)}${e.school ? " — " + esc(e.school) : ""}</span>${e.year ? `<span class="r-dates">${esc(e.year)}</span>` : ""}</div>
        ${e.location ? `<div class="r-item-sub">${esc(e.location)}</div>` : ""}
      </div>`;
    }
  }

  if (state.skills.trim()) {
    const skills = state.skills.split(",").map(s => s.trim()).filter(Boolean);
    html += `<h2 class="r-sec-head">Skills</h2><p>${skills.map(esc).join(" &nbsp;•&nbsp; ")}</p>`;
  }

  sheet.innerHTML = html;
}

function resumePlainText() {
  const p = state.personal, out = [];
  if (p.name) out.push(p.name.toUpperCase());
  if (p.title) out.push(p.title);
  out.push([p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join(" | "));
  out.push("");
  if (state.summary.trim()) { out.push("PROFESSIONAL SUMMARY", state.summary.trim(), ""); }
  const exps = state.experience.filter(e => e.title || e.company || e.bullets.trim());
  if (exps.length) {
    out.push("WORK EXPERIENCE");
    for (const e of exps) {
      out.push(`${e.title}${e.company ? " - " + e.company : ""}${e.location ? ", " + e.location : ""}`);
      const dates = [e.start, e.present ? "Present" : e.end].filter(Boolean).join(" - ");
      if (dates) out.push(dates);
      e.bullets.split("\n").map(b => b.trim()).filter(Boolean).forEach(b => out.push("- " + b));
      out.push("");
    }
  }
  const projs = state.projects.filter(e => e.title || e.bullets.trim());
  if (projs.length) {
    out.push("PROJECTS");
    for (const e of projs) {
      out.push(`${e.title}${e.tech ? " | " + e.tech : ""}`);
      e.bullets.split("\n").map(b => b.trim()).filter(Boolean).forEach(b => out.push("- " + b));
      out.push("");
    }
  }
  const edus = state.education.filter(e => e.degree || e.school);
  if (edus.length) {
    out.push("EDUCATION");
    for (const e of edus) out.push(`${e.degree}${e.school ? " - " + e.school : ""}${e.year ? ", " + e.year : ""}${e.location ? ", " + e.location : ""}`);
    out.push("");
  }
  if (state.skills.trim()) { out.push("SKILLS", state.skills.trim()); }
  return out.join("\n");
}

/* ---------------- cover letter ---------------- */
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function renderCover() {
  const c = cover, sheet = $("#cover-sheet");
  const contact = [c.email, c.phone, c.location].filter(Boolean).map(esc).join(" &nbsp;•&nbsp; ");
  let html = `<div class="cl-head"><div class="r-name" style="font-size:1.45rem">${esc(c.name) || "Your Name"}</div>`;
  if (contact) html += `<div class="r-contact">${contact}</div>`;
  html += `</div>`;
  const dt = fmtDate(c.date);
  if (dt) html += `<p>${esc(dt)}</p>`;
  if (c.recipient || c.company) {
    html += `<p>${esc(c.recipient || "Hiring Manager")}${c.company ? `<br>${esc(c.company)}` : ""}</p>`;
  }
  html += `<p>Dear ${esc(c.recipient || "Hiring Manager")},</p>`;
  if (c.jobTitle) html += `<p><strong>Re: Application for ${esc(c.jobTitle)}${c.company ? " at " + esc(c.company) : ""}</strong></p>`;
  if (c.para1.trim()) html += `<p>${esc(c.para1)}</p>`;
  if (c.para2.trim()) html += `<p>${esc(c.para2)}</p>`;
  if (c.para3.trim()) html += `<p>${esc(c.para3)}</p>`;
  html += `<p>Sincerely,<br><strong>${esc(c.name) || "Your Name"}</strong></p>`;
  sheet.className = "sheet tpl-" + state.template;
  sheet.innerHTML = html;
}

function coverPlainText() {
  const c = cover, out = [];
  if (c.name) out.push(c.name);
  const contact = [c.email, c.phone, c.location].filter(Boolean).join(" | ");
  if (contact) out.push(contact);
  out.push("");
  const dt = fmtDate(c.date);
  if (dt) out.push(dt, "");
  if (c.recipient || c.company) { out.push(c.recipient || "Hiring Manager"); if (c.company) out.push(c.company); out.push(""); }
  out.push(`Dear ${c.recipient || "Hiring Manager"},`, "");
  if (c.jobTitle) out.push(`Re: Application for ${c.jobTitle}${c.company ? " at " + c.company : ""}`, "");
  [c.para1, c.para2, c.para3].forEach(p => { if (p.trim()) out.push(p.trim(), ""); });
  out.push("Sincerely,", c.name || "Your Name");
  return out.join("\n");
}

function fillCoverFromResume() {
  const p = state.personal;
  cover.name = p.name; cover.email = p.email; cover.phone = p.phone; cover.location = p.location;
  if (p.title && !cover.jobTitle) cover.jobTitle = p.title;
  const skillsTop = state.skills.split(",").map(s => s.trim()).filter(Boolean).slice(0, 4).join(", ");
  if (!cover.para1.trim()) {
    cover.para1 = `I am excited to apply for the ${cover.jobTitle || "[Job Title]"} position${cover.company ? ` at ${cover.company}` : ""}. ${state.summary ? state.summary.split(".")[0] + "." : "My background and hands-on project experience make me a strong candidate for this role."}`;
  }
  if (!cover.para2.trim() && skillsTop) {
    cover.para2 = `My key strengths include ${skillsTop}. I enjoy turning complex problems into practical results, and I am confident I can contribute effectively to your team from day one.`;
  }
  if (!cover.para3.trim()) {
    cover.para3 = `I would welcome the opportunity to discuss how my experience aligns with your needs. Thank you for your time and consideration — I look forward to hearing from you.`;
  }
  fillCoverFields(); renderCover(); save();
  toast("Details pulled from your resume — edit freely");
}

/* ---------------- ATS score ---------------- */
function atsEvaluate() {
  const p = state.personal;
  const emailOk = /.+@.+\..+/.test(p.email.trim());
  const words = resumePlainText().split(/\s+/).filter(Boolean).length;
  const checks = [
    { group: "Contact Details", label: "Email address present", hint: "Parsers need a way to reach you — never hide contact info in headers/footers.", level: emailOk ? "pass" : "fail" },
    { group: "Contact Details", label: "Phone number present", hint: "A second contact method increases parse confidence.", level: p.phone.trim() ? "pass" : "warn" },
    { group: "Contact Details", label: "Location listed", hint: "City + country helps location filters.", level: p.location.trim() ? "pass" : "warn" },
    { group: "Content", label: "Professional summary (30–600 chars)", hint: "A short summary gives parsers clean keyword context.", level: state.summary.trim().length >= 30 ? "pass" : "warn" },
    { group: "Content", label: "At least one work experience entry", hint: "Dated roles with bullet achievements parse best.", level: state.experience.some(e => (e.title || e.company) && e.bullets.trim()) ? "pass" : (state.experience.some(e => e.title || e.company) ? "warn" : "fail") },
    { group: "Content", label: "Skills section with 5+ skills", hint: "Comma-separated skills are the easiest for keyword matching.", level: state.skills.split(",").map(s => s.trim()).filter(Boolean).length >= 5 ? "pass" : (state.skills.trim() ? "warn" : "fail") },
    { group: "Content", label: `Good length (${words} words)`, hint: "Aim for 300–1000 words — roughly one to two pages.", level: words >= 300 && words <= 1000 ? "pass" : (words > 0 ? "warn" : "fail") },
    { group: "ATS Format", label: "Standard section headings", hint: "This template always uses parser-friendly headings.", level: "pass" },
    { group: "ATS Format", label: "Single-column layout, no graphics", hint: "This template is single-column with real selectable text.", level: "pass" },
  ];
  const score = Math.round(checks.reduce((a, c) => a + (c.level === "pass" ? 1 : c.level === "warn" ? 0.5 : 0), 0) / checks.length * 100);
  return { checks, score };
}

const gradeFor = (p) => p >= 85 ? "A" : p >= 70 ? "B" : p >= 50 ? "C" : "D";
const checkIcon = (level) => level === "pass" ? "✓" : level === "warn" ? "!" : "✕";
const checkHTML = (c) => `
    <li class="${c.level}">
      <span class="ic">${checkIcon(c.level)}</span>
      <span>${esc(c.label)}<span class="hint">${esc(c.hint)}</span></span>
    </li>`;

function renderATS() {
  const { checks, score } = atsEvaluate();
  const el = $("#ats-score");
  el.textContent = score;
  el.parentElement.style.background =
    `conic-gradient(${score >= 80 ? "var(--ok)" : score >= 50 ? "var(--warn)" : "var(--bad)"} ${score}%, #e4e9f2 0)`;
  const groups = {};
  checks.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
  $("#ats-groups").innerHTML = Object.entries(groups).map(([g, cs]) => {
    const gp = Math.round(cs.reduce((a, c) => a + (c.level === "pass" ? 1 : c.level === "warn" ? 0.5 : 0), 0) / cs.length * 100);
    const gr = gradeFor(gp);
    return `<div class="ats-group">
      <div class="ats-group-head"><span>${esc(g)}</span><span class="grade grade-${gr.toLowerCase()}">${gr}</span></div>
      <div class="bar"><i style="width:${gp}%"></i></div>
      <ul class="checks">${cs.map(checkHTML).join("")}</ul>
    </div>`;
  }).join("");
}

/* ---------------- bullet coach ---------------- */
const ACTION_VERBS = new Set(("achieved,acted,advised,analyzed,architected,boosted,built,championed,closed,coached,collaborated,completed,conceived,conducted,consolidated,constructed,contributed,converted,created,cut,decreased,defined,delivered,designed,developed,devised,directed,discovered,doubled,drafted,drove,earned,eliminated,enabled,engineered,established,evaluated,exceeded,executed,expanded,expedited,founded,formulated,generated,grew,guided,halved,handled,headed,identified,implemented,improved,increased,initiated,innovated,inspired,installed,instituted,integrated,introduced,invented,launched,led,lifted,maintained,managed,marketed,maximized,mentored,merged,modernized,monitored,motivated,negotiated,obtained,opened,optimized,orchestrated,organized,originated,outperformed,overhauled,owned,partnered,performed,pioneered,planned,prepared,presented,prioritized,produced,programmed,proposed,published,raised,ranked,reached,rebuilt,recorded,redesigned,reduced,refined,reformed,repaired,reported,researched,resolved,restructured,revamped,saved,scaled,secured,shipped,shortened,simplified,sold,solved,spearheaded,standardized,steered,streamlined,strengthened,structured,succeeded,supervised,surpassed,surveyed,sustained,systematized,tested,trained,transformed,tripled,unified,updated,upgraded,validated,won,wrote").split(","));

const WEAK_PHRASES = [
  { re: /\bresponsible for\b/i, tip: 'Replace "responsible for" with a strong verb — "Owned", "Led", "Delivered".' },
  { re: /\bhelped\b/i, tip: '"Helped" is weak — say what YOU did: "Built", "Shipped", "Improved".' },
  { re: /\bworked on\b/i, tip: 'Replace "worked on" with the outcome: "Delivered", "Launched".' },
  { re: /\bvarious\b|\betc\.?\b/i, tip: 'Remove vague words like "various" / "etc." — be specific.' },
  { re: /\bhard worker\b|\bteam player\b|\bdetail-oriented\b/i, tip: 'Skip clichés like "team player" — prove it with an achievement instead.' },
];

function analyzeBullets() {
  const items = [];
  const collect = (list, tag) => list.forEach((e, i) =>
    String(e.bullets || "").split("\n").forEach(b => { if (b.trim()) items.push({ text: b.trim(), where: `${tag} ${i + 1}` }); }));
  collect(state.experience, "Job");
  collect(state.projects, "Project");
  return items.map(it => {
    const t = it.text;
    const first = t.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
    const issues = [];
    if (!ACTION_VERBS.has(first)) issues.push("Start with a strong action verb — e.g. Led, Built, Increased, Delivered.");
    if (!/(\d|%)/.test(t)) issues.push("Add a number — how many, how much, what %? Numbers catch eyes.");
    const wc = t.split(/\s+/).length;
    if (wc > 30) issues.push(`A bit long (${wc} words) — trim it to one punchy line.`);
    WEAK_PHRASES.forEach(w => { if (w.re.test(t)) issues.push(w.tip); });
    return { ...it, strong: issues.length === 0, issues };
  });
}

function renderBulletCoach() {
  const box = $("#bullet-coach");
  if (!box) return;
  const items = analyzeBullets();
  if (!items.length) { box.innerHTML = '<p class="muted">Add achievement bullets to your experience or projects to get coaching tips.</p>'; return; }
  const strong = items.filter(i => i.strong).length;
  box.innerHTML = `<p class="coach-summary"><strong>${strong}/${items.length}</strong> bullets are strong.</p>` +
    items.map(it => `<div class="coach-item${it.strong ? " ok" : ""}">
      <div class="coach-bullet">“${esc(it.text)}” <span class="coach-where">${esc(it.where)}</span></div>
      ${it.strong ? '<div class="coach-tip good">✓ Strong bullet — action verb plus numbers. Nice.</div>'
                  : it.issues.map(x => `<div class="coach-tip">⚠ ${esc(x)}</div>`).join("")}
    </div>`).join("");
}

/* ---------------- paste-to-score ---------------- */
function scorePastedText() {
  const t = $("#paste-input").value;
  const box = $("#paste-results");
  if (!t.trim()) { toast("Paste some resume text first"); return; }
  const words = t.split(/\s+/).filter(Boolean).length;
  const bullets = (t.match(/[•\-\*]/g) || []).length;
  const checks = [
    { label: "Email address found", hint: "", level: EMAIL_RE.test(t) ? "pass" : "fail" },
    { label: "Phone number found", hint: "", level: PHONE_RE.test(t) ? "pass" : "fail" },
    { label: "Experience section", hint: "", level: /experience|employment/i.test(t) ? "pass" : "fail" },
    { label: "Education section", hint: "", level: /education|academic/i.test(t) ? "pass" : "fail" },
    { label: "Skills section", hint: "", level: /skills/i.test(t) ? "pass" : "fail" },
    { label: `Good length (${words} words)`, hint: "", level: words >= 300 && words <= 1000 ? "pass" : (words > 50 ? "warn" : "fail") },
    { label: "Bullet points used", hint: "", level: bullets >= 5 ? "pass" : "warn" },
    { label: "Numbers / achievements mentioned", hint: "", level: /(\d+\s*%|\d+)/.test(t) ? "pass" : "warn" },
  ];
  const score = Math.round(checks.reduce((a, c) => a + (c.level === "pass" ? 1 : c.level === "warn" ? 0.5 : 0), 0) / checks.length * 100);
  $("#paste-score").textContent = score + "/100";
  $("#paste-checks").innerHTML = checks.map(checkHTML).join("");
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------------- JD keyword matcher ---------------- */
const STOP = new Set(("a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now,of,as,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,them,his,her,its,our,their,this,that,these,those,am,per,within,across,between,among,including,etc,eg,e.g,ie,i.e,vs,re,join,joining,team,candidate,role,you'll,we're,looking,seeking,hire,hiring,applicant,responsibilities,requirements,qualifications,plus,strong,excellent,good,great,ability,work,working,help,day,us").split(","));

function extractKeywords(text, limit) {
  const freq = new Map();
  text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").split(/\s+/)
    .map(w => w.replace(/^[.#]+|[.#]+$/g, ""))
    .filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
    .forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit || 30).map(e => e[0]);
}

function runJDCheck() {
  const jd = $("#jd-input").value;
  const box = $("#jd-results");
  if (!jd.trim()) { toast("Paste a job description first"); return; }
  const kws = extractKeywords(jd, 30);
  if (!kws.length) { toast("Couldn't find keywords in that text"); return; }
  const resumeText = (" " + resumePlainText().toLowerCase() + " ").replace(/[^a-z0-9+#\s]/g, " ");
  const found = [], missing = [];
  kws.forEach(k => {
    const pattern = new RegExp("(^|\\s)" + k.replace(/[#+.]/g, "\\$&") + "(\\s|$)");
    (pattern.test(resumeText) ? found : missing).push(k);
  });
  const pct = Math.round(found.length / kws.length * 100);
  $("#jd-score").textContent = pct + "%";
  $("#jd-missing").innerHTML = missing.length
    ? missing.map(k => `<span class="kw">${esc(k)}</span>`).join("")
    : `<span class="muted">None — great coverage!</span>`;
  $("#jd-found").innerHTML = found.length
    ? found.map(k => `<span class="kw found">${esc(k)}</span>`).join("")
    : `<span class="muted">None yet.</span>`;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------------- PDF import ---------------- */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(\+\d[\d\s-]{6,}\d|\b0\d[\d\s-]{8,}\d)/;
const LI_RE = /linkedin\.com\/in\/[^\s)]+/i;
const GH_RE = /github\.com\/[^\s)]+/i;
const DATE_RANGE_RE = /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(19|20)\d{2}|(19|20)\d{2})\s*[–—-]\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(19|20)\d{2}|(19|20)\d{2}|present|current|now|till\s+date)/i;

const cleanLine = (s) => s.replace(/\s+/g, " ").trim();
const isBullet = (s) => /^([•\-\*▪◦‣]|\d+[.)])\s+/.test(s.trim());
const stripBullet = (s) => s.trim().replace(/^([•\-\*▪◦‣]|\d+[.)])\s+/, "");

function isHeading(line) {
  const t = line.trim().replace(/:$/, "");
  return t.length < 45 && /^(professional summary|summary|objective|career objective|profile|about me|work experience|experience|employment|employment history|professional experience|education|academic background|academics|qualifications|technical skills|skills|key skills|core skills|competencies|projects|personal projects|selected projects|key projects|certifications|achievements|leadership|activities|interests)$/i.test(t);
}

function splitTitleCompany(head) {
  let title = head, company = "";
  const parts = head.split(/\s*\|\s*/);
  if (parts.length >= 2) { title = parts[0]; company = parts.slice(1).join(" | "); }
  else {
    const m = head.match(/^(.*?)\s+[–—]\s+(.*)$/);
    if (m && m[1].split(" ").length <= 8) { title = m[1]; company = m[2]; }
    else {
      const at = head.match(/^(.*?)\s+at\s+([A-Z][\w&.'-]+(?:\s+[A-Z][\w&.'-]+)*)\s*$/);
      if (at) { title = at[1]; company = at[2]; }
    }
  }
  return { title: title.trim(), company: company.trim() };
}

function parseEntries(lines, kind) {
  const entries = [];
  let cur = null;
  const push = () => { if (cur && (cur.header || cur.bullets.length)) entries.push(cur); cur = null; };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const startsNew = DATE_RANGE_RE.test(l) || (/\s\|\s/.test(l) && cur && cur.bullets.length > 0);
    if (startsNew && !isBullet(l)) {
      push();
      cur = { header: l, bullets: [] };
    } else if (isBullet(l)) {
      if (!cur) cur = { header: "", bullets: [] };
      cur.bullets.push(stripBullet(l));
    } else if (cur) {
      if (!cur.header) cur.header = l;
      else cur.bullets.push(l);
    } else {
      cur = { header: l, bullets: [] };
    }
  }
  push();

  return entries.map(e => {
    const dm = e.header.match(DATE_RANGE_RE);
    const dates = dm ? dm[0] : "";
    const head = e.header.replace(DATE_RANGE_RE, "").trim().replace(/[\s|–—-]+$/, "").trim();
    const segs = dates.split(/\s*[–—-]\s*/);
    const start = (segs[0] || "").trim();
    const endRaw = (segs[1] || "").trim();
    const present = /present|current|^now|till/i.test(endRaw);
    const bullets = e.bullets.join("\n");

    if (kind === "job") {
      const { title, company } = splitTitleCompany(head);
      return { title, company, location: "", start, end: present ? "" : endRaw, present, bullets };
    }
    if (kind === "edu") {
      const { title: degree, company: schoolRaw } = splitTitleCompany(head);
      let school = schoolRaw, location = "";
      const sm = schoolRaw.match(/^(.*?),\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)$/);
      if (sm) { school = sm[1].trim(); location = sm[2].trim(); }
      return { degree, school, year: dates.trim(), location };
    }
    // project
    const { title, company: tech } = splitTitleCompany(head);
    return { title, tech, bullets };
  }).filter(e => e.title || e.degree || e.bullets);
}

function parseResumeText(rawLines) {
  const lines = rawLines.map(cleanLine).filter(Boolean);
  const out = { personal: {}, summary: "", experience: [], projects: [], education: [], skills: "" };
  if (!lines.length) return out;

  const head = lines.slice(0, 10).join("\n");
  const em = head.match(EMAIL_RE); if (em) out.personal.email = em[0];
  const ph = head.match(PHONE_RE); if (ph) out.personal.phone = ph[0].replace(/\s+/g, " ").trim();
  const li = head.match(LI_RE); if (li) out.personal.linkedin = "https://" + li[0].replace(/^https?:\/\//i, "");
  const gh = head.match(GH_RE); if (gh) out.personal.website = "https://" + gh[0].replace(/^https?:\/\//i, "");

  const first = lines[0];
  if (first && !EMAIL_RE.test(first) && !/\d/.test(first) && first.split(" ").length <= 4 && first.length <= 40 && !isHeading(first)) {
    out.personal.name = first;
  }
  for (const l of lines.slice(0, 5)) {
    const m = l.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?),\s*Pakistan/);
    if (m) { out.personal.location = m[0]; break; }
  }

  const sections = {};
  let cur = "_top";
  sections[cur] = [];
  for (const l of lines) {
    if (isHeading(l)) { cur = l.trim().replace(/:$/, "").toLowerCase(); sections[cur] = sections[cur] || []; }
    else sections[cur].push(l);
  }
  const get = (...names) => { for (const n of names) if (sections[n] && sections[n].length) return sections[n]; return []; };

  const sum = get("professional summary", "summary", "objective", "career objective", "profile", "about me");
  if (sum.length) out.summary = sum.join(" ");

  const sk = get("technical skills", "skills", "key skills", "core skills", "competencies");
  if (sk.length) {
    let txt = sk.join("\n");
    ["Languages", "ML / DL", "NLP", "Frameworks", "Tools"].forEach(lbl => { txt = txt.split(lbl).join(" "); });
    out.skills = txt.split(/[,•·▪◦‣|\n]/).map(s => s.trim()).filter(s => s.length > 1).join(", ");
  }

  out.experience = parseEntries(get("work experience", "professional experience", "experience", "employment", "employment history"), "job");
  out.projects   = parseEntries(get("projects", "personal projects", "selected projects", "key projects"), "proj");
  out.education  = parseEntries(get("education", "academic background", "academics", "qualifications"), "edu");
  return out;
}

function applyParsed(p) {
  const per = p.personal;
  if (per.name) state.personal.name = per.name;
  if (per.email) state.personal.email = per.email;
  if (per.phone) state.personal.phone = per.phone;
  if (per.linkedin) state.personal.linkedin = per.linkedin;
  if (per.website && !state.personal.website) state.personal.website = per.website;
  if (per.location) state.personal.location = per.location;
  if (!state.personal.title) {
    const t = p.experience[0];
    if (t && t.title) state.personal.title = t.title;
  }
  if (p.summary) state.summary = p.summary;
  if (p.skills) state.skills = p.skills;
  if (p.experience.length) state.experience = p.experience;
  if (p.projects.length) state.projects = p.projects;
  if (p.education.length) state.education = p.education;
  renderEntries(); fillSimpleFields(); refresh(); save();
}

async function importPDF(file) {
  const status = $("#import-status");
  try {
    if (!window.pdfjsLib) { toast("PDF reader needs internet — check your connection and retry"); return; }
    status.textContent = "Reading PDF…";
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const lines = [];
    for (let pg = 1; pg <= pdf.numPages; pg++) {
      const page = await pdf.getPage(pg);
      const tc = await page.getTextContent();
      let line = "";
      tc.items.forEach(it => {
        line += it.str;
        if (it.hasEOL) { lines.push(line); line = ""; } else line += " ";
      });
      if (line.trim()) lines.push(line);
    }
    status.textContent = "Rebuilding resume…";
    await new Promise(r => setTimeout(r, 30));
    applyParsed(parseResumeText(lines));
    status.textContent = "";
    toast("CV imported — please review each section");
    document.getElementById("builder").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    status.textContent = "";
    toast("Could not read that PDF — try another file");
  }
}

/* ---------------- actions ---------------- */
function loadSample() {
  state = JSON.parse(JSON.stringify(SAMPLE));
  renderEntries(); fillSimpleFields(); refresh(); save();
  toast("Sample resume loaded — edit it freely");
  document.getElementById("builder").scrollIntoView({ behavior: "smooth" });
}

let clearArmed = false;
function clearAll(btn) {
  if (!clearArmed) {
    clearArmed = true;
    btn.textContent = "Sure? Click again";
    setTimeout(() => { clearArmed = false; if (btn.isConnected) btn.textContent = "Clear all"; }, 3000);
    return;
  }
  clearArmed = false;
  btn.textContent = "Clear all";
  const tpl = state.template;
  state = blankState(); state.template = tpl;
  renderEntries(); fillSimpleFields(); refresh(); save();
  toast("Cleared");
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2400);
}

function refresh() { renderPreview(); renderATS(); renderBulletCoach(); }

function printSheet(target) {
  document.body.dataset.printTarget = target;
  renderPreview(); renderCover();
  const p = target === "cover" ? cover : state.personal;
  const nm = (target === "cover" ? cover.name : state.personal.name) || "SwiftCV";
  document.title = nm.replace(/\s+/g, "_") + (target === "cover" ? "_Cover_Letter" : "_Resume");
  setTimeout(() => window.print(), 60);
}

/* ---------------- events ---------------- */
function bindEvents() {
  $("#resume-form").addEventListener("input", (e) => {
    const f = e.target.getAttribute("data-f");
    if (f) {
      const path = f.split(".");
      let o = state;
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
      o[path[path.length - 1]] = e.target.value;
    }
    const ef = e.target.getAttribute("data-exp-f");
    if (ef) {
      const i = +e.target.getAttribute("data-i");
      const exp = state.experience[i];
      if (!exp) return;
      if (ef === "present") {
        exp.present = e.target.checked;
        if (exp.present) exp.end = "";
        renderEntries();
      } else exp[ef] = e.target.value;
    }
    const pf = e.target.getAttribute("data-proj-f");
    if (pf) {
      const i = +e.target.getAttribute("data-i");
      if (state.projects[i]) state.projects[i][pf] = e.target.value;
    }
    const uf = e.target.getAttribute("data-edu-f");
    if (uf) {
      const i = +e.target.getAttribute("data-i");
      if (state.education[i]) state.education[i][uf] = e.target.value;
    }
    refresh(); save();
  });

  $("#cover-letter").addEventListener("input", (e) => {
    const c = e.target.getAttribute("data-c");
    if (c) { cover[c] = e.target.value; renderCover(); save(); }
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.id === "exp-add")  { state.experience.push(blankExp());  renderEntries(); save(); }
    if (t.id === "proj-add") { state.projects.push(blankProj());  renderEntries(); save(); }
    if (t.id === "edu-add")  { state.education.push(blankEdu());   renderEntries(); save(); }
    const xd = t.getAttribute("data-exp-del");
    if (xd !== null && state.experience.length > 1) { state.experience.splice(+xd, 1); renderEntries(); refresh(); save(); }
    const pd = t.getAttribute("data-proj-del");
    if (pd !== null && state.projects.length > 1) { state.projects.splice(+pd, 1); renderEntries(); refresh(); save(); }
    const ud = t.getAttribute("data-edu-del");
    if (ud !== null && state.education.length > 1) { state.education.splice(+ud, 1); renderEntries(); refresh(); save(); }
    const tpl = t.getAttribute("data-tpl");
    if (tpl) {
      state.template = tpl;
      $$(".tpl-btn").forEach(b => b.classList.toggle("is-active", b === t));
      refresh(); renderCover(); save();
    }
  });

  $("#btn-sample").addEventListener("click", loadSample);
  $("#btn-clear").addEventListener("click", (e) => clearAll(e.currentTarget));
  $("#jd-run").addEventListener("click", runJDCheck);
  $("#paste-run").addEventListener("click", scorePastedText);
  $("#cover-from-resume").addEventListener("click", fillCoverFromResume);

  $("#pdf-upload").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importPDF(f);
    e.target.value = "";
  });

  $("#btn-pdf").addEventListener("click", () => printSheet("resume"));
  $("#btn-cover-pdf").addEventListener("click", () => printSheet("cover"));

  $("#btn-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(resumePlainText()); toast("Resume copied as plain text"); }
    catch (err) { toast("Copy blocked by browser — select the preview manually"); }
  });
  $("#btn-cover-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(coverPlainText()); toast("Cover letter copied as plain text"); }
    catch (err) { toast("Copy blocked by browser — select the preview manually"); }
  });

  let printPlaceholder = null;
  function preparePrint() {
    renderPreview(); renderCover();
    const target = document.body.dataset.printTarget === "cover" ? $("#cover-sheet") : $("#resume-sheet");
    if (!target || target.parentNode === document.body) return;
    printPlaceholder = document.createComment("swiftcv-print");
    target.replaceWith(printPlaceholder);
    document.body.appendChild(target);
    document.body.classList.add("is-printing");
  }
  function restorePrint() {
    const target = document.body.dataset.printTarget === "cover" ? $("#cover-sheet") : $("#resume-sheet");
    if (printPlaceholder && target.parentNode === document.body) printPlaceholder.replaceWith(target);
    printPlaceholder = null;
    document.body.classList.remove("is-printing");
  }
  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restorePrint);
}

/* ---------------- init ---------------- */
load();
renderEntries();
fillSimpleFields();
fillCoverFields();
bindEvents();
refresh();
renderCover();
