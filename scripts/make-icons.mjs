// מייצר את אייקוני האפליקציה מ-HTML: שני קלפים בפרספקטיבה, בלי טקסט
import { chromium } from 'playwright';

const html = (size, pad) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;display:grid;place-items:center;
  background:radial-gradient(90% 90% at 30% 20%,#3a3c42,#141518);perspective:${size * 2}px;overflow:hidden">
  <div style="position:relative;width:${size * (0.36 - pad)}px;height:${size * (0.5 - pad * 1.3)}px;transform-style:preserve-3d;transform:rotateX(14deg)">
    <div style="position:absolute;inset:0;border-radius:${size * 0.04}px;transform:translateX(-${size * 0.11}px) rotateY(-30deg) rotateZ(-6deg);
      background:linear-gradient(160deg,#d9d5ce,#6f6658);box-shadow:0 ${size * 0.04}px ${size * 0.08}px rgba(0,0,0,.5)">
      <div style="position:absolute;left:24%;right:24%;top:20%;height:40%;border-radius:50% 50% 46% 46%;
        background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.85),rgba(63,58,51,.35))"></div>
    </div>
    <div style="position:absolute;inset:0;border-radius:${size * 0.04}px;transform:translateX(${size * 0.11}px) translateZ(${size * 0.04}px) rotateY(30deg) rotateZ(6deg);
      background:linear-gradient(160deg,#5f8bb8,#142a42);box-shadow:0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,.55)">
      <div style="position:absolute;left:20%;right:20%;top:46%;height:8%;border-radius:${size * 0.01}px;background:rgba(255,255,255,.7)"></div>
    </div>
  </div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [512, 'icon-512-maskable.png', 0.08]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size, pad));
  await page.screenshot({ path: `public/icons/${name}` });
}
await browser.close();
console.log('icons done');
