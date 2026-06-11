// Sample duchy banner with a wide strip (20px instead of 6px) to average the gradient.
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

const duchyImages = [
  "PHOTO-2026-06-11-09-51-07 23.jpg",
  "PHOTO-2026-06-11-09-51-07 38.jpg",
];

for (const file of duchyImages) {
  const imgPath = path.join(assetsDir, file);
  const label = file.replace("PHOTO-2026-06-11-09-51-07 ", "#").replace(/\.jpg$/, "");
  console.log(`\n=== ${label} ===`);

  const worker = await createWorker("eng", 1, { logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize(imgPath, {}, { blocks: true });
  await worker.terminate();

  const allWords = (data.blocks ?? []).flatMap(bl =>
    bl.paragraphs.flatMap(par => par.lines.flatMap(ln => ln.words))
  );
  const imgH = Math.max(...allWords.map(w => w.bbox.y1), 1);

  const valid = allWords.filter(
    w => w.confidence > 30 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 3
  );
  const clusters = new Map();
  for (const word of valid) {
    const cy = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
    const existing = [...clusters.keys()].find(k => Math.abs(k - cy) <= 30);
    const key = existing ?? cy;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(word);
  }
  const bottomClusters = [...clusters.entries()].filter(([y]) => y > imgH * 0.5);
  const best = bottomClusters.sort((a, b) => b[1].length - a[1].length)[0];
  if (!best) { console.log("❌ No cluster"); continue; }
  const nameWords = best[1].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;

  for (const w of nameWords) {
    const pX = w.bbox.x0, pW = w.bbox.x1 - w.bbox.x0;
    console.log(`\n  "${w.text}"  x=${w.bbox.x0}-${w.bbox.x1}  y=${w.bbox.y0}-${w.bbox.y1}`);
    // Sample at multiple strip positions below the text to visualise the gradient
    for (const offset of [2, 5, 10, 15, 20, 30, 40]) {
      const pY = w.bbox.y1 + offset;
      if (pY + 4 > bitmap.height) break;
      let r = 0, g = 0, b = 0, n = 0;
      for (let x = pX; x < Math.min(pX + pW, bitmap.width); x++) {
        for (let y = pY; y < Math.min(pY + 4, bitmap.height); y++) {
          const i = (y * bitmap.width + x) * 4;
          r += bitmap.data[i]; g += bitmap.data[i + 1]; b += bitmap.data[i + 2]; n++;
        }
      }
      if (n > 0) console.log(`    y1+${String(offset).padStart(2)}  → (${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`);
    }
    // Wide 20px strip (proposed new sampling)
    {
      const pY = w.bbox.y1 + 5;
      let r = 0, g = 0, b = 0, n = 0;
      for (let x = pX; x < Math.min(pX + pW, bitmap.width); x++) {
        for (let y = pY; y < Math.min(pY + 20, bitmap.height); y++) {
          const i = (y * bitmap.width + x) * 4;
          r += bitmap.data[i]; g += bitmap.data[i + 1]; b += bitmap.data[i + 2]; n++;
        }
      }
      if (n > 0) console.log(`    20px strip avg → (${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`);
    }
  }
}
