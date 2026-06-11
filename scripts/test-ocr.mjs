import { createWorker, PSM } from "tesseract.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagePath = path.resolve(__dirname, "../assets/root_winning_screen.jpeg");

const worker = await createWorker("eng", 1, { logger: () => {} });
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
// blocks:true is required — without it data.blocks is always null
const { data } = await worker.recognize(imagePath, {}, { blocks: true });
await worker.terminate();

const allWords = (data.blocks ?? []).flatMap((bl) =>
  bl.paragraphs.flatMap((par) => par.lines.flatMap((ln) => ln.words))
);

const imgH = Math.max(...allWords.map((w) => w.bbox.y1));
const imgW = Math.max(...allWords.map((w) => w.bbox.x1));

// Filter: confidence >30, and at least 2 alphabetic characters (drops pure numbers/symbols)
const valid = allWords.filter(
  (w) => w.confidence > 30 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 2
);

console.log(`Image: ${imgW}x${imgH}, total words: ${allWords.length}, after filter: ${valid.length}`);

// Cluster by Y centroid ±30px
const clusters = new Map();
for (const word of valid) {
  const cy = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
  const existing = [...clusters.keys()].find((k) => Math.abs(k - cy) <= 30);
  const key = existing ?? cy;
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(word);
}

const bannerY = imgH * 0.50;
console.log(`bannerY (50%): ${Math.round(bannerY)}\n`);

console.log("All clusters (bottom 50%, ≥2 words):");
const candidates = [...clusters.entries()]
  .filter(([y, ws]) => y > bannerY && ws.length >= 2)
  .sort((a, b) => {
    const spanA = Math.max(...a[1].map((w) => w.bbox.x1)) - Math.min(...a[1].map((w) => w.bbox.x0));
    const spanB = Math.max(...b[1].map((w) => w.bbox.x1)) - Math.min(...b[1].map((w) => w.bbox.x0));
    return spanB - spanA;
  });

for (const [y, ws] of candidates) {
  const sorted = ws.sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const span = Math.max(...sorted.map((w) => w.bbox.x1)) - Math.min(...sorted.map((w) => w.bbox.x0));
  console.log(`  y=${y}  words=${ws.length}  span=${span}`);
  sorted.forEach((w) => console.log(`    conf=${Math.round(w.confidence)}  x=${w.bbox.x0}-${w.bbox.x1}  "${w.text}"`));
}

if (candidates.length) {
  const winner = candidates[0];
  const names = winner[1].sort((a, b) => a.bbox.x0 - b.bbox.x0).map((w) => w.text.trim());
  console.log(`\n✅ Detected names (${names.length}): ${names.join(", ")}`);
} else {
  console.log("\n❌ No candidate cluster found");
}
