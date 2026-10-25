// ساخت صفحات ایستای /articles از content/articles.mjs و مقاله‌های خودکار پادکست (content/podcast/*.json)
// اجرا: node scripts/build-articles.mjs
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, ARTICLES as MANUAL, NOTE } from "../content/articles.mjs";
import { REF_IMAGES as MANUAL_REFS } from "../content/ref-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "articles");
const SITE = "https://espadanagroup.com";
const OWN_CREDIT = "تصویر از آرشیو تصاویر اسپادانا؛ تصویر نمادین است و به رویداد خبر تعلق ندارد.";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

// مقاله‌هایی که پس از هر پادکست خودکار ساخته می‌شوند (iran-solar-podcast → podcast/site_articles.py)
const PODCAST_DIR = join(ROOT, "content/podcast");
const PODCAST = existsSync(PODCAST_DIR)
  ? readdirSync(PODCAST_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => JSON.parse(readFileSync(join(PODCAST_DIR, f), "utf-8")))
  : [];
const ARTICLES = [...MANUAL, ...PODCAST.filter((p) => !MANUAL.some((m) => m.slug === p.slug))];
const REF_IMAGES = { ...MANUAL_REFS, ...Object.fromEntries(PODCAST.filter((p) => p.refImage).map((p) => [p.slug, p.refImage])) };

const fa = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[d]);
const pad = (n) => fa(String(n).padStart(2, "0"));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const catBySlug = Object.fromEntries(CATEGORIES.map((c, i) => [c.slug, { ...c, index: i + 1 }]));
for (const a of ARTICLES) {
  if (!catBySlug[a.category]) throw new Error(`دستهٔ نامعتبر در مقالهٔ ${a.slug}: ${a.category}`);
  if (!existsSync(join(ROOT, "assets/articles", `${a.image}.webp`))) throw new Error(`تصویر پیدا نشد: ${a.image}`);
}
// اولویت با تصویر مقالهٔ مرجع (ذخیره‌شده روی سرور خودمان)؛ در غیر این صورت تصویر آرشیو اسپادانا
const refOf = (a) => (REF_IMAGES[a.slug] && existsSync(join(ROOT, "assets/articles/ref", `${a.slug}.webp`)) ? REF_IMAGES[a.slug] : null);
const credit = (a) => {
  const r = refOf(a);
  return r
    ? `تصویر: <a href="${esc(r.page)}" target="_blank" rel="noopener nofollow">${esc(r.credit)}</a> (مقالهٔ مرجع)`
    : esc(OWN_CREDIT);
};
const byDate = (x, y) => (x.iso < y.iso ? 1 : x.iso > y.iso ? -1 : 0);
const articlesOf = (slug) => ARTICLES.filter((a) => a.category === slug).sort(byDate);
const articleUrl = (a) => `/articles/${a.category}/${a.slug}.html`;
const catUrl = (c) => `/articles/${c.slug}/`;
const img = (a) => (refOf(a) ? `/assets/articles/ref/${a.slug}.webp` : `/assets/articles/${a.image}.webp`);

const CSS = `
:root{--bg:#fff;--ink:#0b1220;--muted:#5b6475;--line:#e6e9ef;--soft:#f5f7fb;--blue:#1f5eff;--blue-ink:#0b3fd1}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Vazirmatn,Tahoma,sans-serif;line-height:1.9;font-size:16px}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;font-size:12px;color:var(--muted);direction:ltr;text-align:right}
header.top{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.brand{display:flex;align-items:center;gap:12px}
.brand img{height:40px;width:auto;border-radius:6px}
.brand span{font-weight:800;font-size:17px}
.top nav{display:flex;gap:6px;align-items:center}
.top nav a{font-size:14px;padding:8px 14px;border-radius:999px;color:var(--muted)}
.top nav a:hover{color:var(--ink);background:var(--soft)}
.top nav a.cta{background:var(--ink);color:#fff}
.top nav a.cta:hover{background:var(--blue)}
.hero{padding:40px 0 40px;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(34px,6vw,68px);line-height:1.25;margin:14px 0 18px;font-weight:900;letter-spacing:-.01em}
.hero h1 em{font-style:normal;color:var(--blue)}
.hero p{max-width:720px;color:var(--muted);font-size:18px;margin:0}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
.chips a{border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:14px;color:var(--muted)}
.chips a:hover,.chips a.on{border-color:var(--blue);color:var(--blue)}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:6px}
.crumbs a:hover{color:var(--blue)}
section.cat{padding:56px 0;border-bottom:1px solid var(--line)}
.cat-head{display:grid;grid-template-columns:1fr auto;align-items:end;gap:16px;margin-bottom:28px}
.cat-head h2{font-size:clamp(24px,3.4vw,36px);margin:6px 0 4px;font-weight:800}
.cat-head p{margin:0;color:var(--muted);max-width:640px}
.more{font-size:14px;color:var(--blue);white-space:nowrap}
.more:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff;transition:transform .2s,box-shadow .2s,border-color .2s}
.card:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(11,18,32,.08);border-color:#cfd6e4}
.card .ph{aspect-ratio:16/9;background:var(--soft);overflow:hidden}
.card .ph img{width:100%;height:100%;object-fit:cover}
.card .bd{padding:18px 18px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{font-size:17px;line-height:1.7;margin:0;font-weight:800}
.card p{margin:0;color:var(--muted);font-size:14px;line-height:1.85}
.meta{display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--muted)}
.meta b{color:var(--blue);font-weight:600}
article.post{padding:48px 0 24px}
.post-head{max-width:820px}
.post-head h1{font-size:clamp(26px,4.4vw,46px);line-height:1.4;margin:10px 0 16px;font-weight:900}
.post-head .lead{font-size:18px;color:var(--muted);margin:0 0 22px}
figure.cover{margin:28px 0 8px}
figure.cover img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px;background:var(--soft)}
figure.cover figcaption{font-size:12.5px;color:var(--muted);margin-top:8px}
figure.cover figcaption a{color:var(--blue)}
.post-body{max-width:760px;font-size:17.5px;line-height:2.1}
.post-body p{margin:0 0 20px;text-align:justify}
.insight{max-width:760px;margin:30px 0;border:1px solid var(--line);border-right:4px solid var(--blue);background:var(--soft);border-radius:14px;padding:20px 22px}
.insight h2{margin:0 0 6px;font-size:16px;color:var(--blue-ink)}
.insight p{margin:0;line-height:2}
.sources{max-width:760px;margin:30px 0}
.sources h2{font-size:16px;margin:0 0 10px}
.sources ol{margin:0;padding-inline-start:22px}
.sources li{margin:6px 0;font-size:14px;direction:ltr;text-align:left;unicode-bidi:plaintext}
.sources a{color:var(--blue);word-break:break-word}
.sources a:hover{text-decoration:underline}
.note{max-width:760px;font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:24px}
.related{padding:40px 0 64px;border-top:1px solid var(--line);margin-top:32px}
.related h2{font-size:20px;margin:0 0 20px}
.band{background:var(--ink);color:#fff;border-radius:22px;padding:34px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin:56px 0}
.band h2{margin:0 0 4px;font-size:24px}
.band p{margin:0;color:#b9c2d3}
.band a{background:#fff;color:var(--ink);padding:12px 22px;border-radius:999px;font-weight:700}
.band a:hover{background:var(--blue);color:#fff}
footer.foot{border-top:1px solid var(--line);padding:28px 0 40px;color:var(--muted);font-size:13px}
footer.foot .wrap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
footer.foot a:hover{color:var(--blue)}
/* رادیو شبکه خورشیدی ایران — دکمهٔ شیشه‌ای نقره‌ای‌آبی زیر «مشاوره» */
.radio-strip{display:flex;justify-content:flex-end;padding-top:20px}
.radio{display:flex;flex-direction:column;align-items:center;gap:7px}
.radio-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:12px;padding:6px 22px 6px 12px;border-radius:999px;
  background:linear-gradient(135deg,rgba(248,251,255,.95) 0%,rgba(214,228,246,.85) 45%,rgba(176,203,236,.8) 100%);
  border:1px solid rgba(255,255,255,.95);color:#0b3fd1;font-weight:800;font-size:15px;
  box-shadow:0 10px 26px rgba(31,94,255,.18),0 2px 6px rgba(11,18,32,.08),inset 0 1px 0 #fff,inset 0 -8px 16px rgba(120,160,215,.25);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .2s,box-shadow .2s}
.radio-btn::after{content:"";position:absolute;inset:-40% auto -40% -60%;width:40%;transform:rotate(18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:radioShine 4.2s ease-in-out infinite}
.radio-btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(31,94,255,.26),0 2px 6px rgba(11,18,32,.08),inset 0 1px 0 #fff,inset 0 -8px 16px rgba(120,160,215,.3)}
.radio-btn:active{transform:scale(.97)}
.radio-btn svg{width:78px;height:58px;flex:none;filter:drop-shadow(0 3px 4px rgba(60,40,10,.25))}
.radio-btn .live{display:inline-flex;align-items:center;gap:6px}
.radio-btn .live i{width:8px;height:8px;border-radius:50%;background:#ff3b30;box-shadow:0 0 0 0 rgba(255,59,48,.6);animation:radioLive 1.6s infinite}
.radio-cap{font-size:12.5px;font-weight:700;color:var(--muted);letter-spacing:.01em}
.r-needle{animation:radioNeedle 3.6s ease-in-out infinite}
.r-lamp{animation:radioLamp 1.9s ease-in-out infinite}
.r-wave{opacity:0;animation:radioWave 2.4s ease-out infinite}
.r-wave.w2{animation-delay:.8s}.r-wave.w3{animation-delay:1.6s}
@keyframes radioNeedle{0%,100%{transform:translateX(0)}35%{transform:translateX(17px)}55%{transform:translateX(11px)}80%{transform:translateX(21px)}}
@keyframes radioLamp{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes radioWave{0%{opacity:.9;transform:scale(.6)}100%{opacity:0;transform:scale(1.4)}}
@keyframes radioLive{0%{box-shadow:0 0 0 0 rgba(255,59,48,.6)}70%{box-shadow:0 0 0 7px rgba(255,59,48,0)}100%{box-shadow:0 0 0 0 rgba(255,59,48,0)}}
@keyframes radioShine{0%,60%{left:-60%}100%{left:130%}}
@media (max-width:960px){.grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){
  .radio-strip{justify-content:center;padding-top:14px}
  .radio-btn{font-size:14px}
  .wrap{padding:0 16px}
  .grid{grid-template-columns:1fr}
  .top nav a:not(.cta){display:none}
  .brand span{display:none}
  .hero{padding:44px 0 28px}
  .hero p{font-size:16px}
  .cat-head{grid-template-columns:1fr}
  .post-body{font-size:16.5px}
  .band{padding:24px}
}
@media (prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}.r-needle,.r-lamp,.r-wave,.radio-btn::after,.radio-btn .live i{animation:none}.r-wave{opacity:.6}}
`;

function layout({ title, description, canonical, image, body, jsonld, ogType = "website" }) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="fa_IR">
<meta property="og:site_name" content="اسپادانا">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/logo.jpg">
<link rel="preload" href="/assets/fonts/Vazirmatn-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/vazirmatn.css">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
<script type="speculationrules">{"prerender":[{"where":{"href_matches":"/articles/*"},"eagerness":"moderate"}],"prefetch":[{"where":{"href_matches":"/articles/*"},"eagerness":"conservative"}]}</script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/articles/" aria-label="مقالات اسپادانا"><img src="/assets/logo.jpg" alt="اسپادانا" width="120" height="40"><span>مقالات اسپادانا</span></a>
  <nav><a href="/">صفحهٔ اصلی</a><a href="/shop">فروشگاه</a><a href="https://t.me/IranSolarNetwork" target="_blank" rel="noopener">اخبار ویژه</a><a class="cta" href="/#contact">مشاوره</a></nav>
</div></header>
<div class="wrap radio-strip"><div class="radio">
  <a class="radio-btn" href="https://t.me/IranSolarNetwork" target="_blank" rel="noopener" aria-label="رادیو شبکه خورشیدی ایران در تلگرام">
    <svg viewBox="0 0 64 48" aria-hidden="true">
  <defs>
    <linearGradient id="rWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9783f"/><stop offset="1" stop-color="#6e3f1c"/></linearGradient>
    <linearGradient id="rDial" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6"/><stop offset="1" stop-color="#f1d58e"/></linearGradient>
    <radialGradient id="rGlow"><stop offset="0" stop-color="#ffd76a"/><stop offset=".55" stop-color="#ff9d2e" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
  </defs>
  <g fill="none" stroke="#1f5eff" stroke-width="1.6" stroke-linecap="round">
    <path class="r-wave" d="M50 6a6 6 0 0 1 0 8" style="transform-origin:46px 10px"/>
    <path class="r-wave w2" d="M53 3a10 10 0 0 1 0 14" style="transform-origin:46px 10px"/>
    <path class="r-wave w3" d="M56 0a14 14 0 0 1 0 20" style="transform-origin:46px 10px"/>
  </g>
  <line x1="40" y1="14" x2="46" y2="4" stroke="#7a8597" stroke-width="1.4"/><circle cx="46" cy="4" r="1.6" fill="#c9d3e2"/>
  <rect x="3" y="13" width="50" height="33" rx="9" fill="url(#rWood)"/>
  <rect x="5" y="15" width="46" height="29" rx="7" fill="none" stroke="#e0a868" stroke-opacity=".5"/>
  <rect x="8" y="18" width="40" height="11" rx="3" fill="url(#rDial)" stroke="#5b3416" stroke-width=".8"/>
  <g stroke="#8a5a2b" stroke-width=".7"><path d="M12 20v3M16 20v2M20 20v3M24 20v2M28 20v3M32 20v2M36 20v3M40 20v2M44 20v3"/></g>
  <rect class="r-needle" x="13" y="19" width="1.6" height="9" rx=".8" fill="#e0261b"/>
  <circle class="r-lamp" cx="45" cy="25" r="6" fill="url(#rGlow)"/>
  <circle cx="45" cy="25" r="1.6" fill="#fff1c2"/>
  <g fill="#3b200c" opacity=".75"><rect x="9" y="32" width="24" height="1.6" rx=".8"/><rect x="9" y="35.5" width="24" height="1.6" rx=".8"/><rect x="9" y="39" width="24" height="1.6" rx=".8"/></g>
  <circle cx="41" cy="37" r="4" fill="#d9c08a" stroke="#5b3416" stroke-width=".8"/><circle cx="41" cy="37" r="1.2" fill="#5b3416"/>
  <rect x="9" y="45" width="6" height="2.5" rx="1" fill="#3b200c"/><rect x="41" y="45" width="6" height="2.5" rx="1" fill="#3b200c"/>
</svg>
    <span class="live"><i></i>رادیو خورشیدی</span>
  </a>
  <span class="radio-cap">اولین رادیو شبکه خورشیدی ایران</span>
</div></div>
${body}
<footer class="foot"><div class="wrap">
  <span>© اسپادانا (طرح و نظارت اسپادانا) — مقالات تخصصی انرژی خورشیدی</span>
  <span><a href="/">espadanagroup.com</a> · <a href="/shop">فروشگاه ZINEXX</a></span>
</div></footer>
</body>
</html>
`;
}

function card(a) {
  const c = catBySlug[a.category];
  return `<a class="card" href="${articleUrl(a)}">
  <div class="ph"><img src="${img(a)}" alt="${esc(a.title)}" loading="lazy" width="1200" height="675"></div>
  <div class="bd"><div class="meta"><b>${esc(c.title)}</b><span>${esc(a.date)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></div>
</a>`;
}

function chips(active) {
  return `<div class="chips"><a href="/articles/"${active ? "" : ' class="on"'}>همه</a>${CATEGORIES.map(
    (c) => `<a href="${catUrl(c)}"${active === c.slug ? ' class="on"' : ""}>${esc(c.title)}</a>`
  ).join("")}</div>`;
}

function band() {
  return `<div class="band"><div><h2>برق پایدار برای خانه و کسب‌وکار</h2><p>اینورتر هیبریدی و باتری‌های لیتیومی ZINEXX، با پشتیبانی نمایندهٔ رسمی در ایران.</p></div><a href="/shop">ورود به فروشگاه</a></div>`;
}

function write(rel, html) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

rmSync(OUT, { recursive: true, force: true });

// صفحهٔ اصلی مقالات
{
  const sections = CATEGORIES.map((c, i) => {
    const list = articlesOf(c.slug);
    return `<section class="cat" id="${c.slug}"><div class="wrap">
  <div class="cat-head"><div><div class="mono">${String(i + 1).padStart(2, "0")} / ${esc(c.en)}</div><h2>${esc(c.title)}</h2><p>${esc(c.intro)}</p></div><a class="more" href="${catUrl(c)}">همهٔ ${fa(list.length)} مقاله ←</a></div>
  <div class="grid">${list.slice(0, 3).map(card).join("")}</div>
</div></section>`;
  }).join("\n");
  const body = `<main>
<section class="hero"><div class="wrap">
  <div class="mono">ESPADANA / INSIGHTS — ${ARTICLES.length} ARTICLES</div>
  <h1>تازه‌ترین تحولات <em>انرژی خورشیدی</em><br>از نگاه اسپادانا</h1>
  <p>گزیدهٔ رسمی خبرهای مطرح‌شده در پادکست‌های «شبکه خورشیدی ایران»، با ارجاع به منبع اصلی هر خبر و نگاهی به فرصت‌های آن برای بازار ایران.</p>
  ${chips()}
</div></section>
${sections}
<div class="wrap">${band()}</div>
</main>`;
  write(
    "index.html",
    layout({
      title: "مقالات اسپادانا | تحولات انرژی خورشیدی، ذخیره‌سازی و شبکه",
      description: "مقالات تخصصی اسپادانا دربارهٔ ذخیره‌سازی انرژی، اینورتر، پنل خورشیدی، سازه و نصب، شبکهٔ هوشمند و کاربردهای تازه، با ذکر منابع.",
      canonical: "/articles/",
      image: img(ARTICLES[0]),
      body,
      jsonld: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "مقالات اسپادانا",
        url: `${SITE}/articles/`,
        publisher: { "@type": "Organization", name: "اسپادانا", url: SITE, logo: `${SITE}/assets/logo.jpg` },
      },
    })
  );
}

// صفحات دسته‌ها و مقالات
for (const c of CATEGORIES) {
  const cat = catBySlug[c.slug];
  const list = articlesOf(c.slug);
  const body = `<main>
<section class="hero"><div class="wrap">
  <div class="crumbs"><a href="/articles/">مقالات</a> / ${esc(c.title)}</div>
  <div class="mono">${String(cat.index).padStart(2, "0")} / ${esc(c.en)}</div>
  <h1>${esc(c.title)}</h1>
  <p>${esc(c.intro)}</p>
  ${chips(c.slug)}
</div></section>
<section class="cat"><div class="wrap"><div class="grid">${list.map(card).join("")}</div>${band()}</div></section>
</main>`;
  write(
    `${c.slug}/index.html`,
    layout({
      title: `${c.title} | مقالات اسپادانا`,
      description: c.intro,
      canonical: catUrl(c),
      image: img(list[0]),
      body,
    })
  );

  list.forEach((a, i) => {
    const related = list.filter((x) => x !== a).slice(0, 3);
    const more = related.length ? related : ARTICLES.filter((x) => x.category !== a.category).sort(byDate).slice(0, 3);
    const body = `<main><article class="post"><div class="wrap">
  <div class="post-head">
    <div class="crumbs"><a href="/articles/">مقالات</a> / <a href="${catUrl(c)}">${esc(c.title)}</a></div>
    <div class="mono">${String(cat.index).padStart(2, "0")}.${String(i + 1).padStart(2, "0")} / ${esc(c.en)}</div>
    <h1>${esc(a.title)}</h1>
    <p class="lead">${esc(a.summary)}</p>
    <div class="meta"><b>${esc(c.title)}</b><span>${esc(a.date)}</span><span>تحریریهٔ اسپادانا</span></div>
  </div>
  <figure class="cover"><img src="${img(a)}" alt="${esc(a.title)}" width="1200" height="675"><figcaption>${credit(a)}</figcaption></figure>
  <div class="post-body">${a.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  <aside class="insight"><h2>فرصت برای بازار ایران</h2><p>${esc(a.insight)}</p></aside>
  <section class="sources"><h2>منابع</h2><ol>${a.sources
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.title)}</a></li>`)
    .join("")}</ol></section>
  <p class="note">این مقاله بر اساس منابع ذکرشده تهیه شده و ارقام آن مطابق گزارش همان منابع است. ${esc(NOTE)}</p>
  <section class="related"><h2>مقالات مرتبط</h2><div class="grid">${more.map(card).join("")}</div></section>
</div></article></main>`;
    write(
      `${c.slug}/${a.slug}.html`,
      layout({
        title: `${a.title} | مقالات اسپادانا`,
        description: a.summary,
        canonical: articleUrl(a),
        image: img(a),
        ogType: "article",
        body,
        jsonld: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.summary,
          image: `${SITE}${img(a)}`,
          datePublished: a.iso,
          inLanguage: "fa-IR",
          articleSection: c.title,
          mainEntityOfPage: `${SITE}${articleUrl(a)}`,
          author: { "@type": "Organization", name: "اسپادانا" },
          publisher: { "@type": "Organization", name: "اسپادانا", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.jpg` } },
          citation: a.sources.map((s) => s.url),
        },
      })
    );
  });
}

// نقشهٔ سایت مقالات
const urls = ["/articles/", ...CATEGORIES.map(catUrl), ...ARTICLES.map(articleUrl)];
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);

console.log(`ساخته شد: ${ARTICLES.length} مقاله در ${CATEGORIES.length} دسته → articles/`);
