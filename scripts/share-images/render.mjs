// Draws the link-preview pictures (og:image, 1200×630) that WhatsApp and other apps show when a page is shared.
// Each picture is built from the game's own art and drawn by Chromium, so the Hebrew text and its nikkud are shaped
// correctly. Writes public/og/<page>.jpg. Run again after a change of the art or of the text below:
//   CDP_URL=<a Chromium DevTools endpoint> node scripts/share-images/render.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
const mime = { webp: 'image/webp', png: 'image/png', woff2: 'font/woff2' }
const data = (p) => `data:${mime[p.split('.').pop()]};base64,${readFileSync(root + p).toString('base64')}`

const sigalit = data('public/fonts/sigalit/sigalit-regular-fm.woff2')
const andika = data('public/fonts/andika/Andika-Regular.woff2')
const art = {
  wizard: data('src/assets/home/card.webp'),
  wizardEn: data('src/spellquest/english/assets/img/card.webp'),
  cuckoo: data('src/clock/assets/img/case-cuckoo.webp'),
  bear: data('src/clock/assets/img/bear-happy.webp'),
  workshop: data('src/clock/assets/img/workshop.webp'),
  space: data('src/spacecat/assets/img/space-bg.png'),
  ship: data('src/spacecat/assets/img/cat-ship-1.png'),
  planet1: data('src/spacecat/assets/img/surface-1.png'),
  planet2: data('src/spacecat/assets/img/surface-2.png'),
}

/** a clock face with hands at 3:00, laid over the cuckoo case's empty dial */
const dial = (size) => `<svg width="${size}" height="${size}" viewBox="-50 -50 100 100">
  ${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-40" x2="0" y2="-34" stroke="#6b3e1f" stroke-width="3" transform="rotate(${i * 30})"/>`).join('')}
  <line x1="0" y1="0" x2="0" y2="-30" stroke="#3b2210" stroke-width="5" stroke-linecap="round"/>
  <line x1="0" y1="0" x2="20" y2="0" stroke="#3b2210" stroke-width="6" stroke-linecap="round"/>
  <circle r="4" fill="#3b2210"/></svg>`

const cuckooClock = (h) => `<div class="cuckoo" style="height:${h}px">
  <img src="${art.cuckoo}" style="height:${h}px">
  <div class="dial" style="width:${h * 0.29}px;height:${h * 0.29}px;left:${h * 0.234}px;top:${h * 0.313}px">${dial(h * 0.29)}</div></div>`

const css = `
@font-face { font-family: Sigalit; src: url(${sigalit}); }
@font-face { font-family: Andika; src: url(${andika}); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: Sigalit, sans-serif; position: relative; }
.text { position: absolute; top: 0; bottom: 0; right: 70px; width: 520px; display: flex; flex-direction: column;
  justify-content: center; direction: rtl; text-align: right; gap: 18px; }
h1 { font-size: 120px; line-height: 1; font-weight: normal; }
h2 { font-size: 50px; line-height: 1.15; font-weight: normal; }
p { font-size: 32px; line-height: 1.3; }
.art { position: absolute; }
.cuckoo { position: relative; display: inline-block; }
.cuckoo img { display: block; }
.dial { position: absolute; }
.planet { position: absolute; aspect-ratio: 1; border-radius: 50%; background-size: 200% 100%; background-position: 30% 0;
  display: grid; place-items: center; box-shadow: inset -14px -14px 24px #0009, inset 6px 6px 12px #ffffff55, 0 3px 10px #0009; }
.planet span { width: 58%; aspect-ratio: 1; border-radius: 50%; background: #0d0a26dd; color: #fff; display: grid; place-items: center;
  font: 700 48px system-ui, sans-serif; }
.en { font-family: Andika, sans-serif; direction: ltr; }
`

const pages = {
  home: `<body style="background:#f4efe6">
    <img class="art" src="${art.wizard}" style="left:20px;top:40px;width:560px">
    <div class="art" style="left:40px;top:330px">${cuckooClock(270)}</div>
    <img class="art" src="${art.bear}" style="left:215px;top:385px;height:230px">
    <img class="art" src="${art.ship}" style="left:430px;top:380px;width:200px;transform:rotate(-20deg)">
    <div class="text" style="color:#2b4c7e">
      <h1 style="color:#2e6cb5">אָלֶף</h1>
      <h2>משחקי למידה לכיתות הראשונות</h2>
      <p style="color:#5b6b80">קריאה בעברית, אנגלית, שעון וחשבון</p>
    </div></body>`,

  'spellquest-he': `<body style="background:radial-gradient(circle at 30% 40%, #2a2160, #0b0824 70%)">
    <img class="art" src="${art.wizard}" style="left:20px;top:45px;width:660px">
    <div class="text" style="color:#f3e9c6">
      <h1 class="en" style="font-size:84px;color:#ffd96a;text-align:right">Spell Quest</h1>
      <h2>קוֹרְאִים בְּעִבְרִית</h2>
      <p style="color:#c9c3e6">אותיות, ניקוד והברות, ואחר כך מילים. המשחק מתאים את עצמו לילד.</p>
    </div></body>`,

  'spellquest-en': `<body style="background:radial-gradient(circle at 30% 40%, #1f4a3a, #0b0824 70%)">
    <img class="art" src="${art.wizardEn}" style="left:20px;top:45px;width:660px">
    <div class="text" style="color:#f3e9c6">
      <h1 class="en" style="font-size:84px;color:#ffd96a;text-align:right">Spell Quest</h1>
      <h2>לומדים לקרוא באנגלית</h2>
      <p style="color:#c9e6d8">צלילי האותיות, חיבור צלילים למילים ואיות.</p>
    </div></body>`,

  clock: `<body style="background:url(${art.workshop}) center/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(270deg,#3b2210ee 0,#3b2210cc 45%,#3b221000 75%)"></div>
    <div class="art" style="left:70px;top:40px">${cuckooClock(560)}</div>
    <img class="art" src="${art.bear}" style="left:380px;top:250px;height:360px">
    <div class="text" style="color:#fbeedd">
      <h1 style="color:#ffd27a">שָׁעוֹן</h1>
      <h2>לומדים לקרוא שעון</h2>
      <p style="color:#f0dcc0">שעות שלמות, חצאים ורבעים, ואחר כך כל חמש דקות. בעברית ובאנגלית.</p>
    </div></body>`,

  spacecat: `<body style="background:url(${art.space}) center/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(270deg,#070b1fdd 0,#070b1f99 45%,#070b1f00 70%)"></div>
    <div class="planet" style="left:70px;top:420px;width:150px;background-image:url(${art.planet1})"><span>3</span></div>
    <div class="planet" style="left:500px;top:60px;width:110px;background-image:url(${art.planet2})"><span style="font-size:36px">7</span></div>
    <img class="art" src="${art.ship}" style="left:140px;top:60px;width:420px;transform:rotate(-25deg)">
    <div class="text" style="color:#e9f0ff">
      <h1 class="en" style="font-size:96px;color:#ffd96a;text-align:right">Space Cat</h1>
      <h2>חשבון בחלל</h2>
      <p style="color:#c6d3f5">חיבור וחיסור עד 100, כפל וחילוק. המשחק מוצא לבד את הרמה של הילד.</p>
    </div></body>`,
}

const cdp = process.env.CDP_URL
if (!cdp) throw new Error('set CDP_URL to a Chromium DevTools endpoint')
const browser = await chromium.connectOverCDP(cdp)
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
try {
  mkdirSync(root + 'public/og', { recursive: true })
  for (const [name, body] of Object.entries(pages)) {
    const page = await context.newPage()
    try {
      await page.setContent(`<!doctype html><html lang="he"><head><meta charset="utf-8"><style>${css}</style></head>${body}</html>`)
      await page.evaluate(() => document.fonts.ready)
      const jpg = await page.screenshot({ type: 'jpeg', quality: 85 })
      writeFileSync(root + `public/og/${name}.jpg`, jpg)
      console.log(`public/og/${name}.jpg ${Math.round(jpg.length / 1024)} KB`)
    } finally {
      await page.close()
    }
  }
} finally {
  await context.close()
  await browser.close() // closes this connection only; the shared Chromium keeps running
}
