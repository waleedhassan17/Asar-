"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export interface ContactState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(80, "That name is a little long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That doesn't look like an email address.")
    .max(200),
  topic: z.enum(["help", "verify", "mentor", "other"]),
  message: z
    .string()
    .trim()
    .min(10, "A sentence or two, so we know how to reply.")
    .max(4000, "That's longer than we can store — trim it a little."),
});

/**
 * "Get in touch".
 *
 * Goes through `api_submit_contact_message`, which validates again and
 * rate limits by address — the zod schema here is for the error message,
 * not for safety. Nothing is read back: the sender gets an
 * acknowledgement, not a row id.
 */
export async function submitContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic") ?? "help",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_submit_contact_message", { p: parsed.data });

  if (error) return { error: friendlyError(error) };

  return { ok: true };
}
