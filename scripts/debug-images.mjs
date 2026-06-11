import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

const targets = [
  "PHOTO-2026-06-11-09-51-07 2.jpg",  // duchy win
  "PHOTO-2026-06-11-09-51-07 5.jpg",  // riverfolk win
];

for (const imgFile of targets) {
  const imgPath = path.join(assetsDir, imgFile);
  console.log(`\n=== ${imgFile} ===`);

  const worker = await createWorker("eng", 1, { logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize(imgPath, {}, { blocks: true });
  await worker.terminate();

  const allWords = (data.blocks ?? []).flatMap(bl =>
    bl.paragraphs.flatMap(par => par.lines.flatMap(ln => ln.words))
  );

  console.log(`Total words: ${allWords.length}`);
  console.log("All words (conf > 20):");
  allWords
    .filter(w => w.confidence > 20)
    .forEach(w => console.log(`  conf=${Math.round(w.confidence).toString().padStart(3)}  y=${w.bbox.y0}-${w.bbox.y1}  "${w.text}"`));

  // Show clusters
  const valid = allWords.filter(
    w => w.confidence > 30 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 3
  );
  const imgH = Math.max(...allWords.map(w => w.bbox.y1), 1);
  console.log(`\nImage height: ${imgH}`);
  console.log(`Valid words (≥3 alpha, conf>30): ${valid.length}`);

  const clusters = new Map();
  for (const word of valid) {
    const cy = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
    const existing = [...clusters.keys()].find(k => Math.abs(k - cy) <= 30);
    const key = existing ?? cy;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(word);
  }

  console.log("\nClusters in bottom 50%:");
  for (const [y, ws] of [...clusters.entries()].filter(([y]) => y > imgH * 0.5)) {
    console.log(`  y=${y} words=${ws.length}: ${ws.map(w => `"${w.text}"`).join(", ")}`);
  }

  // Sample colors at the banner row — try both above and below each word
  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;

  // Find the names row (widest spanning cluster in bottom 50%, even if 1 word)
  const bottom50 = [...clusters.entries()].filter(([y]) => y > imgH * 0.5);
  if (bottom50.length === 0) {
    console.log("\n❌ No clusters in bottom 50%");
    // Try with ≥1 word
    const validLax = allWords.filter(
      w => w.confidence > 20 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 3
    );
    console.log(`Lax filter (conf>20, ≥3 alpha) words in bottom 50%:`);
    validLax.filter(w => (w.bbox.y0+w.bbox.y1)/2 > imgH*0.5)
      .forEach(w => console.log(`  y=${Math.round((w.bbox.y0+w.bbox.y1)/2)}  conf=${Math.round(w.confidence)}  "${w.text}"`));
    continue;
  }

  const nameWords = bottom50
    .sort((a,b) => b[1].length - a[1].length)[0][1]
    .sort((a,b) => a.bbox.x0 - b.bbox.x0);

  console.log(`\nSelected names row: ${nameWords.map(w => `"${w.text}"`).join(", ")}`);

  // Sample color BELOW each name (matching the component's approach)
  function sampleBelow(word) {
    const pX = word.bbox.x0;
    const pW = word.bbox.x1 - word.bbox.x0;
    const pY = word.bbox.y1 + 5;
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = pX; x < Math.min(pX + pW, bitmap.width); x++) {
      for (let y = pY; y < Math.min(pY + 6, bitmap.height); y++) {
        const i = (y * bitmap.width + x) * 4;
        r += bitmap.data[i]; g += bitmap.data[i+1]; b += bitmap.data[i+2];
        n++;
      }
    }
    return n > 0 ? [Math.round(r/n), Math.round(g/n), Math.round(b/n)] : null;
  }

  for (const w of nameWords) {
    const c = sampleBelow(w);
    console.log(`  "${w.text}" → below=(${c ? c.join(",") : "null"})`);
  }
}
