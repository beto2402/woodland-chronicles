// One-off script: populates Tip/TipTarget from prisma/data/wiki-tips.json.
// Safe to re-run — upserts Tip by [gameId, key], then replaces its TipTarget rows.
// Run with: node prisma/seed-wiki-tips.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, "data/wiki-tips.json"), "utf-8"));

  for (const t of data.tips) {
    const tip = await prisma.tip.upsert({
      where: { gameId_key: { gameId: t.gameId, key: t.key } },
      create: { gameId: t.gameId, key: t.key, text: t.text },
      update: { text: t.text },
    });
    await prisma.tipTarget.deleteMany({ where: { tipId: tip.id } });
    await prisma.tipTarget.createMany({
      data: t.targets.map((target) => ({
        tipId: tip.id,
        factionId: target.factionId,
        actionId: target.actionId ?? null,
      })),
    });
  }

  console.log(`Seeded ${data.tips.length} tips.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
