import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

type Params = { params: Promise<{ path: string[] }> };

// Streams a privately-stored Hall of Fame image back to the browser. Reads are
// public (like the rest of the group's data); the Blob token stays server-side.
export async function GET(_req: Request, { params }: Params) {
  const { path } = await params;
  const pathname = path.map((p) => decodeURIComponent(p)).join("/");

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Blob fetch failed:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
