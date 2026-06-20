// Debug alliance/lizard confusion and marquise detection.
// Shows sampled color, distance to every reference, and which faction wins.
import { createWorker, PSM } from "tesseract.js";
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");

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

const targets = [
  { file: "PHOTO-2026-06-11-09-51-07 45.jpg", note: "alliance win; Rangy=alliance, Xunux=lizard" },
  { file: "PHOTO-2026-06-11-09-51-07 47.jpg", note: "possible marquise" },
];

for (const { file, note } of targets) {
  const imgPath = path.join(assetsDir, file);
  const label = file.replace("PHOTO-2026-06-11-09-51-07 ", "#").replace(/\.jpg$/, "");
  console.log(`\n=== ${label} — ${note} ===`);

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
  const bottom = [...clusters.entries()].filter(([y]) => y > imgH * 0.5);
  const best = bottom.sort((a, b) => {
    const sa = Math.max(...a[1].map(w=>w.bbox.x1)) - Math.min(...a[1].map(w=>w.bbox.x0));
    const sb = Math.max(...b[1].map(w=>w.bbox.x1)) - Math.min(...b[1].map(w=>w.bbox.x0));
    return sb - sa;
  })[0];

  if (!best) { console.log("❌ No cluster"); continue; }
  const nameWords = best[1].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  console.log(`Detected names: ${nameWords.map(w => `"${w.text}" (x=${w.bbox.x0}-${w.bbox.x1}, y=${w.bbox.y0}-${w.bbox.y1})`).join(", ")}`);

  const jimpImg = await Jimp.read(imgPath);
  const { bitmap } = jimpImg;

  for (const word of nameWords) {
    const x0 = Math.max(0, word.bbox.x0), x1 = Math.min(bitmap.width, word.bbox.x1);
    const y0 = Math.max(0, word.bbox.y0), y1 = Math.min(bitmap.height, word.bbox.y1 + 10);

    // Collect all pixels in bbox, split by brightness zone
    const light = [], mid = [], dark = [];
    for (let px = x0; px < x1; px++) {
      for (let py = y0; py < y1; py++) {
        const i = (py * bitmap.width + px) * 4;
        const r = bitmap.data[i], g = bitmap.data[i+1], b = bitmap.data[i+2];
        const br = (r + g + b) / 3;
        if (br > 200) light.push([r,g,b]);
        else if (br < 40) dark.push([r,g,b]);
        else mid.push([r,g,b]);
      }
    }
    const total = light.length + mid.length + dark.length;
    console.log(`\n  "${word.text}":`);
    console.log(`    bbox pixels: ${total} total — ${light.length} light (>200), ${mid.length} mid, ${dark.length} dark (<40)`);

    if (!mid.length) { console.log("    ⚠️  no mid-tone pixels"); continue; }
    mid.sort((a, b) => (a[0]+a[1]+a[2]) - (b[0]+b[1]+b[2]));
    const median = mid[Math.floor(mid.length / 2)];
    console.log(`    median mid-tone: (${median.join(",")})`);

    // Show mean mid-tone too
    const mean = mid.reduce((s, c) => [s[0]+c[0], s[1]+c[1], s[2]+c[2]], [0,0,0])
      .map(v => Math.round(v / mid.length));
    console.log(`    mean  mid-tone: (${mean.join(",")})`);

    // Sample at fixed offsets to visualise gradient
    console.log(`    gradient at x-center (${Math.round((x0+x1)/2)}):`);
    const cx = Math.round((x0 + x1) / 2);
    for (const py of [y0, Math.round((y0+y1)/2), y1-1]) {
      if (py < 0 || py >= bitmap.height) continue;
      const i = (py * bitmap.width + cx) * 4;
      const r=bitmap.data[i], g=bitmap.data[i+1], b=bitmap.data[i+2];
      console.log(`      y=${py}: (${r},${g},${b})`);
    }

    // Distance to every reference
    console.log(`    distances to refs (median sample):`);
    const dists = Object.entries(FACTION_REF_COLORS)
      .map(([id, ref]) => ({ id, d: Math.round(rgbDist(median, ref)) }))
      .sort((a, b) => a.d - b.d);
    dists.forEach(({ id, d }) =>
      console.log(`      ${String(d).padStart(4)}  ${id}${d > 80 ? " (above threshold)" : ""}`)
    );
    console.log(`    → would pick: ${dists[0].d <= 80 ? dists[0].id : "(blank — above threshold)"}`);
  }
}
