// One-off script: populates the Match table from prisma/data/worldcup2026-schedule.json
// (2026 FIFA World Cup fixtures, researched from Wikipedia). Safe to re-run — upserts by
// matchNumber. Run with: node prisma/seed-quinielas.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Known already-played knockout matches decided by extra time / penalties — the source
// data only carries the final score, so shootout results are recorded here by hand.
const RESULT_OVERRIDES = {
  74: { decidedBy: "PENALTIES", penaltyHomeScore: 3, penaltyAwayScore: 4 }, // Germany 1-1 Paraguay, Paraguay won 4-3 on pens
  75: { decidedBy: "PENALTIES", penaltyHomeScore: 2, penaltyAwayScore: 3 }, // Netherlands 1-1 Morocco, Morocco won 3-2 on pens
  82: { decidedBy: "EXTRA_TIME" }, // Belgium 3-2 Senegal after extra time, no penalties
};

function computeWinner(stage, homeTeam, awayTeam, homeScore, awayScore, penaltyHomeScore, penaltyAwayScore) {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return homeTeam;
  if (awayScore > homeScore) return awayTeam;
  if (stage === "GROUP") return null; // draw
  return (penaltyHomeScore ?? 0) > (penaltyAwayScore ?? 0) ? homeTeam : awayTeam;
}

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, "data/worldcup2026-schedule.json"), "utf-8"));

  const idByMatchNumber = new Map();

  for (const m of data.matches) {
    const homeScore = m.actualHomeScore ?? null;
    const awayScore = m.actualAwayScore ?? null;
    const override = RESULT_OVERRIDES[m.matchNumber];
    const penaltyHomeScore = override?.penaltyHomeScore ?? null;
    const penaltyAwayScore = override?.penaltyAwayScore ?? null;
    const decidedBy = homeScore == null ? null : (override?.decidedBy ?? "REGULATION");
    const winnerTeam = computeWinner(m.stage, m.homeTeam, m.awayTeam, homeScore, awayScore, penaltyHomeScore, penaltyAwayScore);

    const row = await prisma.match.upsert({
      where: { matchNumber: m.matchNumber },
      create: {
        matchNumber: m.matchNumber,
        stage: m.stage,
        groupName: m.group,
        homeTeam: m.homeTeam,
        homeTeamPlaceholder: m.homeTeamPlaceholder,
        awayTeam: m.awayTeam,
        awayTeamPlaceholder: m.awayTeamPlaceholder,
        kickoffAt: new Date(m.kickoff),
        venue: m.venue,
        homeScore,
        awayScore,
        decidedBy,
        penaltyHomeScore,
        penaltyAwayScore,
        winnerTeam,
      },
      update: {
        stage: m.stage,
        groupName: m.group,
        homeTeam: m.homeTeam,
        homeTeamPlaceholder: m.homeTeamPlaceholder,
        awayTeam: m.awayTeam,
        awayTeamPlaceholder: m.awayTeamPlaceholder,
        kickoffAt: new Date(m.kickoff),
        venue: m.venue,
        homeScore,
        awayScore,
        decidedBy,
        penaltyHomeScore,
        penaltyAwayScore,
        winnerTeam,
      },
    });
    idByMatchNumber.set(m.matchNumber, row.id);
  }

  for (const m of data.matches) {
    const data_ = {};
    if (m.nextMatchNumber != null) {
      data_.nextMatchId = idByMatchNumber.get(m.nextMatchNumber);
      data_.nextMatchSlot = m.nextMatchSlot;
    }
    if (m.loserNextMatchNumber != null) {
      data_.loserNextMatchId = idByMatchNumber.get(m.loserNextMatchNumber);
      data_.loserNextMatchSlot = m.loserNextMatchSlot;
    }
    if (Object.keys(data_).length > 0) {
      await prisma.match.update({ where: { matchNumber: m.matchNumber }, data: data_ });
    }
  }

  console.log(`Seeded ${data.matches.length} matches.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
