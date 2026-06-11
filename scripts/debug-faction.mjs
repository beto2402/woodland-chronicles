// Deep-dive debug for specific images — shows all detected words,
// their Y positions, the selected names cluster, and below-text colors.
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

// duchy: 2, 9, 23, 38, 39 — riverfolk: 5, 12, 27, 40, 49
const targets = [
  { file: "PHOTO-2026-06-11-09-51-07 2.jpg",  faction: "duchy" },
  { file: "PHOTO-2026-06-11-09-51-07 9.jpg",  faction: "duchy" },
  { file: "PHOTO-2026-06-11-09-51-07 23.jpg", faction: "duchy" },
  { file: "PHOTO-2026-06-11-09-51-07 38.jpg", faction: "duchy" },
  { file: "PHOTO-2026-06-11-09-51-07 39.jpg", faction: "duchy" },
  { file: "PHOTO-2026-06-11-09-51-07 5.jpg",  faction: "riverfolk" },
  { file: "PHOTO-2026-06-11-09-51-07 12.jpg", faction: "riverfolk" },
  { file: "PHOTO-2026-06-11-09-51-07 27.jpg", faction: "riverfolk" },
  { file: "PHOTO-2026-06-11-09-51-07 40.jpg", faction: "riverfolk" },
  { file: "PHOTO-2026-06-11-09-51-07 49.jpg", faction: "riverfolk" },
];

for (const { file, faction } of targets) {
  const imgPath = path.join(assetsDir, file);
  const label = file.replace("PHOTO-2026-06-11-09-51-07 ", "#").replace(/\.(jpg|jpeg)$/, "");
  console.log(`\n=== ${label} (${faction}) ===`);

  const worker = await createWorker("eng", 1, { logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize(imgPath, {}, { blocks: true });
  await worker.terminate();

  const allWords = (data.blocks ?? []).flatMap(bl =>
    bl.paragraphs.flatMap(par => par.lines.flatMap(ln => ln.words))
  );
  const imgH = Math.max(...allWords.map(w => w.bbox.y1), 1);
  const imgW = Math.max(...allWords.map(w => w.bbox.x1), 1);
  console.log(`Image: ${imgW}x${imgH}`);

  // Show all words in the bottom 50%
  const bottomWords = allWords.filter(
    w => (w.bbox.y0 + w.bbox.y1) / 2 > imgH * 0.5 && w.confidence > 20
  );
  console.log(`Bottom-half words (conf>20):`);
  bottomWords.sort((a,b) => (a.bbox.y0+a.bbox.y1)/2 - (b.bbox.y0+b.bbox.y1)/2)
    .forEach(w => {
      const cy = Math.round((w.bbox.y0+w.bbox.y1)/2);
      const nalpha = (w.text.match(/[a-zA-Z]/g) ?? []).length;
      console.log(`  y=${cy}  conf=${Math.round(w.confidence).toString().padStart(3)}  alpha=${nalpha}  x=${w.bbox.x0}-${w.bbox.x1}  "${w.text}"`);
    });

  // Show what the extraction script would pick as names cluster
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
  const best = bottomClusters.sort((a,b) => b[1].length - a[1].length)[0];
  if (!best) { console.log("❌ No cluster found"); continue; }

  const nameWords = best[1].sort((a,b) => a.bbox.x0 - b.bbox.x0);
  console.log(`\nSelected cluster: [${nameWords.map(w=>`"${w.text}"`).join(", ")}]`);

  // Sample below each word
  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;
  for (const w of nameWords) {
    const pX = w.bbox.x0, pW = w.bbox.x1 - w.bbox.x0;
    const pY = w.bbox.y1 + 5;
    let r=0, g=0, b=0, n=0;
    for (let x=pX; x<Math.min(pX+pW, bitmap.width); x++) {
      for (let y=pY; y<Math.min(pY+6, bitmap.height); y++) {
        const i=(y*bitmap.width+x)*4;
        r+=bitmap.data[i]; g+=bitmap.data[i+1]; b+=bitmap.data[i+2]; n++;
      }
    }
    const color = n>0 ? [Math.round(r/n),Math.round(g/n),Math.round(b/n)] : null;
    console.log(`  "${w.text}"  x=${w.bbox.x0}-${w.bbox.x1}  y=${w.bbox.y0}-${w.bbox.y1}  → below=(${color?.join(",") ?? "null"})`);
  }
}
