// Extract banner colors from Root winning screenshots.
// Uses OCR to find the player name bounding boxes, then samples the banner
// color in the gap between the score circle and the name text (cleanest area).
// Maps each winner's color to their faction via the "X Wins" title.
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

// Multiple keywords per faction to handle OCR misreads (e.g. "Ducby" for "Duchy")
const WIN_TITLE_MAP = {
  "hundreds": "lord",
  "duchy":    "duchy",
  "ducby":    "duchy",   // common OCR misread of "Duchy"
  "underground": "duchy",
  "eyrie":    "eyrie",
  "keepers":  "keepers",
  "riverfolk":"riverfolk",
  "marquise": "marquise",
  "alliance": "alliance",
  "vagabond": "vagabond",
  "lizard":   "lizard",
  "corvid":   "corvid",
};

// Sample the median banner color over the word's full bounding box height.
// Skips near-white pixels (text) and near-black pixels (shadow/border) so the
// gradient doesn't skew the result — only the solid faction color band counts.
function sampleBannerColor(bitmap, word) {
  const { data, width, height } = bitmap;
  const x0 = Math.max(0, word.bbox.x0);
  const x1 = Math.min(width, word.bbox.x1);
  const y0 = Math.max(0, word.bbox.y0);
  const y1 = Math.min(height, word.bbox.y1 + 10); // slight margin below
  const samples = [];
  for (let px = x0; px < x1; px++) {
    for (let py = y0; py < y1; py++) {
      const i = (py * width + px) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 200 || brightness < 40) continue; // skip white text & black shadow
      samples.push([r, g, b]);
    }
  }
  if (!samples.length) return null;
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const mid = samples[Math.floor(samples.length / 2)];
  return [Math.round(mid[0]), Math.round(mid[1]), Math.round(mid[2])];
}

const factionSamples = {}; // faction → [[r,g,b]]
const images = fs.readdirSync(assetsDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).sort();

console.log(`Processing ${images.length} images...\n`);

for (const imgFile of images) {
  const imgPath = path.join(assetsDir, imgFile);
  const label = imgFile.replace("PHOTO-2026-06-11-09-51-07 ", "#").replace(/\.(jpg|jpeg)$/, "");

  const worker = await createWorker("eng", 1, { logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize(imgPath, {}, { blocks: true }); // blocks:true required
  await worker.terminate();

  const allWords = (data.blocks ?? []).flatMap(bl =>
    bl.paragraphs.flatMap(par => par.lines.flatMap(ln => ln.words))
  );

  // Identify winning faction from title
  const titleText = allWords.map(w => w.text.toLowerCase()).join(" ");
  let winningFaction = null;
  for (const [kw, fid] of Object.entries(WIN_TITLE_MAP)) {
    if (titleText.includes(kw)) { winningFaction = fid; break; }
  }

  // Find names cluster — require ≥3 alphabetic chars to filter 2-letter UI tokens
  // ("NA", "NZ", etc.) that OCR picks up from the score-circle laurel decoration.
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
  const imgH = Math.max(...allWords.map(w => w.bbox.y1), 1);
  // Prefer ≥2-word clusters; fall back to ≥1 (handles 2-player games where one name garbles)
  const sortByCoverage = (a, b) => {
    const sa = Math.max(...a[1].map(w => w.bbox.x1)) - Math.min(...a[1].map(w => w.bbox.x0));
    const sb = Math.max(...b[1].map(w => w.bbox.x1)) - Math.min(...b[1].map(w => w.bbox.x0));
    return sb - sa;
  };
  const bottomClusters = [...clusters.entries()].filter(([y]) => y > imgH * 0.50);
  const multiWordCandidates = bottomClusters.filter(([, ws]) => ws.length >= 2).sort(sortByCoverage);
  const singleWordCandidates = bottomClusters.filter(([, ws]) => ws.length >= 1).sort(sortByCoverage);

  let nameWords;
  if (multiWordCandidates.length) {
    nameWords = multiWordCandidates[0][1].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  } else if (singleWordCandidates.length) {
    nameWords = singleWordCandidates[0][1].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  } else {
    // Last resort: lower confidence threshold
    const laxValid = allWords.filter(
      w => w.confidence > 20 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 3
    );
    const laxClusters = new Map();
    for (const word of laxValid) {
      const cy = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
      const existing = [...laxClusters.keys()].find(k => Math.abs(k - cy) <= 30);
      const key = existing ?? cy;
      if (!laxClusters.has(key)) laxClusters.set(key, []);
      laxClusters.get(key).push(word);
    }
    const laxCandidates = [...laxClusters.entries()]
      .filter(([y]) => y > imgH * 0.50)
      .sort((a, b) => b[1].length - a[1].length);
    if (!laxCandidates.length) {
      console.log(`${label}: ❌ no names cluster`);
      continue;
    }
    nameWords = laxCandidates[0][1].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  }

  const names = nameWords.map(w => w.text.trim());

  // Load image for pixel sampling
  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;

  const colors = nameWords.map(word => sampleBannerColor(bitmap, word));

  const colorStr = colors.map((c, i) => `${names[i]}=${c ? `(${c[0]},${c[1]},${c[2]})` : "null"}`).join("  ");
  console.log(`${label.padEnd(8)} win=${String(winningFaction ?? "?").padEnd(12)} ${colorStr}`);

  // Associate each player's color with their faction if we know it (winner only, positionally)
  // Winner is index 0 (sorted highest score → leftmost)
  if (winningFaction && colors[0]) {
    if (!factionSamples[winningFaction]) factionSamples[winningFaction] = [];
    factionSamples[winningFaction].push(colors[0]);
  }
}

console.log("\n=== WINNER COLORS PER FACTION ===");
for (const [fac, samples] of Object.entries(factionSamples).sort()) {
  const avg = samples.reduce((a, c) => [a[0]+c[0], a[1]+c[1], a[2]+c[2]], [0,0,0])
    .map(v => Math.round(v / samples.length));
  const all = samples.map(c => `[${c}]`).join(", ");
  console.log(`  ${fac.padEnd(12)}: avg=[${avg.join(",")}]  n=${samples.length}  all: ${all}`);
}
