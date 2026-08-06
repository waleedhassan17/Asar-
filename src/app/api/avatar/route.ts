import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Avatar upload.
 *
 * Same shape as the proof upload next door — server-side so the file type
 * and size are checked somewhere the visitor can't edit, and so the
 * bucket never needs a client insert policy. Two things differ:
 *
 *  - it requires a session, and the stored path is keyed by the user's
 *    id, so one person cannot fill the bucket on someone else's behalf;
 *  - `upsert: true` on a per-user path, because replacing your own
 *    picture should not leave the old one orphaned forever.
 *
 * The declared MIME type is never trusted; the magic bytes decide.
 */
export async function POST(request: NextRequest) {
  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

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
    return NextResponse.json({ error: "That image is over 2 MB — try a smaller one." }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP." }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
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

  const name = `${user.id}/avatar.${EXTENSIONS[file.type]}`;

  const { error } = await supabase.storage.from("avatars").upload(name, bytes, {
    contentType: file.type,
    // Short cache: the path is stable per user, so a long cache would
    // show a stale face after someone changes their picture. The URL
    // returned below carries a cache-buster for the same reason.
    cacheControl: "60",
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ error: "The upload didn't go through." }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(name);

  return NextResponse.json({ url: `${publicUrl}?v=${Date.now()}` });
}

function looksLikeImage(bytes: Uint8Array) {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  return (
    startsWith(0xff, 0xd8, 0xff) || // jpeg
    startsWith(0x89, 0x50, 0x4e, 0x47) || // png
    (startsWith(0x52, 0x49, 0x46, 0x46) && // webp: RIFF….WEBP
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50)
  );
}
