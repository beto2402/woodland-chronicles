// End-to-end validation: runs the full OCR + color-sample + faction-match pipeline
// on images with known ground truth, then reports accuracy.
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

// Must match GroupLeaderboard.tsx exactly
const FACTION_REF_COLORS = {
  marquise:  [190, 114,  52],
  eyrie:     [ 57,  85, 121],
  alliance:  [ 18, 138,  65],
  vagabond:  [ 90,  92,  90],
  riverfolk: [ 65, 137, 132],
  lizard:    [135, 135,  46],
  duchy:     [198, 136,  75],
  corvid:    [130, 105, 152],
  lord:      [160,   5,  22],
  keepers:   [ 70, 109, 138],
};

function rgbDist(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

function matchFaction(color, used) {
  let best = "", bestD = Infinity;
  for (const [id, ref] of Object.entries(FACTION_REF_COLORS)) {
    if (used.has(id)) continue;
    const d = rgbDist(color, ref);
    if (d < bestD) { bestD = d; best = id; }
  }
  return { faction: best, dist: Math.round(bestD) };
}

function sampleBannerColor(bitmap, word) {
  const { data, width, height } = bitmap;
  const x0 = Math.max(0, word.bbox.x0), x1 = Math.min(width, word.bbox.x1);
  const y0 = Math.max(0, word.bbox.y0), y1 = Math.min(height, word.bbox.y1 + 10);
  const samples = [];
  for (let px = x0; px < x1; px++) {
    for (let py = y0; py < y1; py++) {
      const i = (py * width + px) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      if (brightness > 200 || brightness < 40) continue;
      samples.push([r, g, b]);
    }
  }
  if (!samples.length) return null;
  samples.sort((a, b) => (a[0]+a[1]+a[2]) - (b[0]+b[1]+b[2]));
  return samples[Math.floor(samples.length / 2)];
}

// Ground truth: [file, [ [name_fragment, faction], ... ] ]
// Only list players where we're confident of their faction.
// "name_fragment" is a substring that should appear in the OCR'd name.
const GROUND_TRUTH = [
  // Reference image — all 4 players known
  ["root_winning_screen.jpeg", [
    ["8vius",   "lord"],
    ["Xunux",   "alliance"],
    ["Elmogch", "marquise"],
    ["Rangy",   "lizard"],
  ]],
  // Confirmed from extraction — multiple games, winner faction known
  ["PHOTO-2026-06-11-09-51-07 15.jpg", [["Rangy", "alliance"]]],
  ["PHOTO-2026-06-11-09-51-07 28.jpg", [["Rangy", "alliance"]]],
  ["PHOTO-2026-06-11-09-51-07 43.jpg", [["Rangy", "alliance"]]],
  ["PHOTO-2026-06-11-09-51-07 45.jpg", [["Rangy", "alliance"]]],
  ["PHOTO-2026-06-11-09-51-07 36.jpg", [["Rangy", "lord"]]],
  ["PHOTO-2026-06-11-09-51-07 30.jpg", [["Rangy", "lizard"]]],
  ["PHOTO-2026-06-11-09-51-07 37.jpg", [["Rangy", "lizard"]]],
  ["PHOTO-2026-06-11-09-51-07 26.jpg", [["Rangy", "marquise"]]],
  ["PHOTO-2026-06-11-09-51-07 21.jpg", [["Rangy", "eyrie"]]],
  ["PHOTO-2026-06-11-09-51-07 6.jpg",  [["Rangy", "eyrie"]]],
  ["PHOTO-2026-06-11-09-51-07 24.jpg", [["Rangy", "keepers"]]],
  ["PHOTO-2026-06-11-09-51-07 27.jpg", [["Rangy", "riverfolk"]]],
  ["PHOTO-2026-06-11-09-51-07 25.jpg", [["Rangy", "corvid"]]],
  ["PHOTO-2026-06-11-09-51-07 41.jpg", [["Rangy", "corvid"]]],
  ["PHOTO-2026-06-11-09-51-07 11.jpg", [["Rangy", "vagabond"]]],
  ["PHOTO-2026-06-11-09-51-07 13.jpg", [["Rangy", "vagabond"]]],
  ["PHOTO-2026-06-11-09-51-07 23.jpg", [["Rangy", "duchy"]]],
  ["PHOTO-2026-06-11-09-51-07 38.jpg", [["jen",   "duchy"]]],
];

let correct = 0, total = 0;
const failures = [];

for (const [file, groundTruth] of GROUND_TRUTH) {
  const imgPath = path.join(assetsDir, file);
  const label = file.replace("PHOTO-2026-06-11-09-51-07 ", "#").replace(/\.(jpg|jpeg)$/, "");

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
  const best = bottomClusters.sort((a, b) => {
    const sa = Math.max(...a[1].map(w=>w.bbox.x1)) - Math.min(...a[1].map(w=>w.bbox.x0));
    const sb = Math.max(...b[1].map(w=>w.bbox.x1)) - Math.min(...b[1].map(w=>w.bbox.x0));
    return sb - sa;
  })[0];

  if (!best) {
    console.log(`${label}: ❌ no cluster`);
    continue;
  }
  const nameWords = best[1].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;

  const used = new Set();
  const detections = nameWords.map(word => {
    const color = sampleBannerColor(bitmap, word);
    if (!color) return { name: word.text, faction: "?", dist: 999, color: null };
    const { faction, dist } = matchFaction(color, used);
    used.add(faction);
    return { name: word.text, faction, dist, color };
  });

  // Check ground truth
  for (const [fragment, expectedFaction] of groundTruth) {
    const hit = detections.find(d => d.name.toLowerCase().includes(fragment.toLowerCase()));
    if (!hit) {
      console.log(`${label}: ❌ "${fragment}" not detected in OCR output`);
      failures.push({ label, fragment, expected: expectedFaction, got: "not detected" });
      total++;
      continue;
    }
    total++;
    const ok = hit.faction === expectedFaction;
    if (ok) {
      correct++;
      console.log(`${label}: ✅ ${hit.name} → ${hit.faction} (dist=${hit.dist})`);
    } else {
      console.log(`${label}: ❌ ${hit.name} → ${hit.faction} (expected ${expectedFaction}, dist=${hit.dist}, color=${hit.color})`);
      failures.push({ label, fragment, expected: expectedFaction, got: hit.faction, dist: hit.dist, color: hit.color });
    }
  }
}

console.log(`\n=== RESULT: ${correct}/${total} correct (${Math.round(100*correct/total)}%) ===`);
if (failures.length) {
  console.log("\nFailed cases:");
  for (const f of failures) {
    console.log(`  ${f.label} "${f.fragment}": expected=${f.expected} got=${f.got} dist=${f.dist ?? "-"} color=${f.color ?? "-"}`);
  }
}
