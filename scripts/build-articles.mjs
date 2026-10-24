// ساخت صفحات ایستای /articles از content/articles.mjs
// اجرا: node scripts/build-articles.mjs
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, ARTICLES, NOTE } from "../content/articles.mjs";
import { REF_IMAGES } from "../content/ref-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "articles");
const SITE = "https://espadanagroup.com";
const OWN_CREDIT = "تصویر از آرشیو تصاویر اسپادانا؛ تصویر نمادین است و به رویداد خبر تعلق ندارد.";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

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
.hero{padding:72px 0 40px;border-bottom:1px solid var(--line)}
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
@media (max-width:960px){.grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){
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
@media (prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}}
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
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/articles/" aria-label="مقالات اسپادانا"><img src="/assets/logo.jpg" alt="اسپادانا" width="120" height="40"><span>مقالات اسپادانا</span></a>
  <nav><a href="/">صفحهٔ اصلی</a><a href="/shop">فروشگاه</a><a href="https://t.me/IranSolarNetwork" target="_blank" rel="noopener">اخبار ویژه</a><a class="cta" href="/#contact">مشاوره</a></nav>
</div></header>
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
