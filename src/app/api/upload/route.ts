import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Accepts a single image upload, stores it in Vercel Blob, returns its public URL.
// Gated to authenticated users; the moment-creation route enforces group membership.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 5MB limit" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage not configured (missing BLOB_READ_WRITE_TOKEN)" },
      { status: 500 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "img";
  try {
    // Private store: blobs aren't publicly reachable. We store privately and serve
    // them back through our own /api/blob proxy route (see GET there).
    const blob = await put(`hall-of-fame/${crypto.randomUUID()}.${ext}`, file, {
      access: "private",
      contentType: file.type,
    });
    return NextResponse.json({ url: `/api/blob/${blob.pathname}` }, { status: 201 });
  } catch (err) {
    console.error("Blob upload failed:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 502 });
  }
}
