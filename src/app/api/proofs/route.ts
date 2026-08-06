import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Proof photo upload (C-104 / T-03 / R-03).
 *
 * Uploads go through the server rather than straight from the browser so
 * that the file type and size are checked somewhere the visitor can't
 * edit, and so storage never needs a public insert policy. The bucket
 * itself is read-only to everyone else.
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 5 MB — try a smaller one." },
      { status: 413 },
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, WEBP or GIF image." },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Trust the magic bytes, not the declared MIME type.
  if (!looksLikeImage(bytes)) {
    return NextResponse.json({ error: "That file isn't a real image." }, { status: 415 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Uploads aren't configured on this deployment." },
      { status: 503 },
    );
  }

  const name = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;

  const { error } = await supabase.storage.from("proofs").upload(name, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: "The upload didn't go through." }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("proofs").getPublicUrl(name);

  return NextResponse.json({ url: publicUrl });
}

function looksLikeImage(bytes: Uint8Array) {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  return (
    startsWith(0xff, 0xd8, 0xff) || // jpeg
    startsWith(0x89, 0x50, 0x4e, 0x47) || // png
    startsWith(0x47, 0x49, 0x46, 0x38) || // gif
    (startsWith(0x52, 0x49, 0x46, 0x46) && // webp: RIFF….WEBP
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50)
  );
}
