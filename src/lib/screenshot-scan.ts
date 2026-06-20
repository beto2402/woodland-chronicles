// Client-side OCR + color-matching pipeline for Root digital end-game screenshots.
// No React dependency — pure functions usable in tests and calibration scripts.

// Reference banner colors calibrated from 52 winning screenshots using
// gradient-aware median sampling (skips white text + black shadow pixels).
// Knaves/Lilypad/Twilight are physical-only expansions not in the digital game.
export const FACTION_REF_COLORS: Record<string, [number, number, number]> = {
  marquise:  [190, 114,  52],  // orange-amber — 1 winner sample
  eyrie:     [ 57,  85, 121],  // blue — avg of 2 consistent samples
  alliance:  [ 18, 138,  65],  // green — avg of 6 consistent samples
  vagabond:  [ 90,  92,  90],  // gray — 4 identical samples
  riverfolk: [ 65, 137, 132],  // teal — avg of 2 consistent samples
  lizard:    [135, 135,  46],  // olive — avg of 2 consistent samples
  duchy:     [198, 136,  75],  // amber — avg of 2 winner samples
  corvid:    [130, 105, 152],  // purple — avg of 2 consistent samples
  lord:      [160,   5,  22],  // crimson — avg of 2 consistent samples
  keepers:   [ 70, 109, 138],  // steel blue — 1 winner sample
};

export function rgbDist(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const next =
        a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev;
      prev = next;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// OCR-based screenshot analysis.
// Finds all text bounding boxes, clusters by Y position to identify the names row
// (all player names sit on the same horizontal band), then samples the banner color
// below each name for faction matching.
//
// Winner is always leftmost in Root digital, but their name is often unreadable due
// to the golden frame — so leftmost detected name ≠ leftmost actual player.
//
// All faction banners have a brightness gradient (bright→dark). Gradient-aware median
// sampling skips near-white (text) and near-black (shadow) pixels, taking the median
// brightness of what remains — this lands on the solid mid-tone color regardless of
// where the bounding box falls on the gradient.
export async function analyzeScreenshot(
  file: File,
): Promise<{ names: string[]; factions: string[] }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / bitmap.width);
  const W = Math.floor(bitmap.width * scale);
  const H = Math.floor(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, W, H);

  // Lazy-load Tesseract — downloads worker + eng model on first use (~15 MB, then cached).
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  // PSM.SPARSE_TEXT: finds text anywhere without assuming a document layout.
  // blocks:true is required — without it data.blocks is always null regardless of PSM.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  await worker.terminate();

  type TWord = {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  };
  const allWords: TWord[] = (data.blocks ?? []).flatMap((bl) =>
    bl.paragraphs.flatMap((par) => par.lines.flatMap((ln) => ln.words as TWord[])),
  );

  // ≥3 alphabetic chars drops numbers, symbols, and 2-letter OCR artifacts ("NA", "NZ")
  // from the score-circle laurel decoration.
  const valid = allWords.filter(
    (w) => w.confidence > 30 && (w.text.match(/[a-zA-Z]/g) ?? []).length >= 3,
  );

  const clusters = new Map<number, TWord[]>();
  for (const word of valid) {
    const cy = Math.round((word.bbox.y0 + word.bbox.y1) / 2);
    const existing = [...clusters.keys()].find((k) => Math.abs(k - cy) <= 30);
    const key = existing ?? cy;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(word);
  }

  // Best candidate: bottom 50% of image, ≥2 words, widest horizontal span.
  const bannerY = H * 0.5;
  const candidates = [...clusters.entries()]
    .filter(([y, ws]) => y > bannerY && ws.length >= 2)
    .sort((a, b) => {
      const spanA =
        Math.max(...a[1].map((w) => w.bbox.x1)) -
        Math.min(...a[1].map((w) => w.bbox.x0));
      const spanB =
        Math.max(...b[1].map((w) => w.bbox.x1)) -
        Math.min(...b[1].map((w) => w.bbox.x0));
      return spanB - spanA;
    });

  if (!candidates.length) return { names: [], factions: [] };

  const nameWords = candidates[0][1].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const names = nameWords.map((w) => w.text.trim());

  const used = new Set<string>();
  const factions = nameWords.map((word) => {
    const x0 = Math.max(0, word.bbox.x0);
    const x1 = Math.min(W, word.bbox.x1);
    const y0 = Math.max(0, word.bbox.y0);
    const y1 = Math.min(H, word.bbox.y1 + 10);
    const patch = ctx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));

    const samples: [number, number, number][] = [];
    for (let i = 0; i < patch.data.length; i += 4) {
      const r = patch.data[i], g = patch.data[i + 1], b = patch.data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 200 || brightness < 40) continue;
      samples.push([r, g, b]);
    }
    samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    const mid = samples[Math.floor(samples.length / 2)] ?? [128, 128, 128];
    const color: [number, number, number] = mid;

    let best = "", bestD = Infinity;
    for (const [id, ref] of Object.entries(FACTION_REF_COLORS)) {
      if (used.has(id)) continue;
      const d = rgbDist(color, ref);
      if (d < bestD) { bestD = d; best = id; }
    }
    // Reject if no reference is close enough — better blank than wrong.
    // Max legitimate distance in validation was 52; 80 gives a comfortable margin.
    if (bestD > 80) best = "";
    if (best) used.add(best);
    return best;
  });

  return { names, factions };
}
