// One-off script: uploads the split per-faction guide PDFs (third-party BGG content, kept out
// of git — see game-content/root/rules-reference/wiki-pdf-guides/) to Vercel Blob as private
// blobs, matching the pathnames getFactionGuidePdfBlobPath() in src/lib/wiki/loaders.ts expects.
// Safe to re-run (allowOverwrite).
// Run with: BLOB_READ_WRITE_TOKEN=... node prisma/upload-wiki-pdfs.mjs
import { put } from "@vercel/blob";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "../game-content/root/rules-reference/wiki-pdf-guides");

const FACTIONS = [
  "marquise",
  "alliance",
  "eyrie",
  "vagabond",
  "riverfolk",
  "lizard",
  "duchy",
  "keepers",
  "lord",
  "corvid",
];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN — set it in your shell before running this script.");
    process.exit(1);
  }

  for (const factionId of FACTIONS) {
    const file = join(SRC_DIR, `${factionId}.pdf`);
    if (!existsSync(file)) {
      console.warn(`Skipping ${factionId}: ${file} not found`);
      continue;
    }
    const buf = readFileSync(file);
    const blob = await put(`wiki-guides/root/${factionId}.pdf`, buf, {
      access: "private",
      contentType: "application/pdf",
      allowOverwrite: true,
    });
    console.log(`${factionId} -> ${blob.pathname}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
