import { NextResponse } from "next/server";
import { rolloverIfDue } from "@/lib/seasons";

// Invoked by Vercel Cron (see vercel.json) on a daily schedule. Not for interactive use, but
// safe to curl directly for testing — authenticated via a shared secret, and idempotent (a
// duplicate call the same day is a no-op once the season has already rolled over).
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await rolloverIfDue();
  return NextResponse.json(result);
}
