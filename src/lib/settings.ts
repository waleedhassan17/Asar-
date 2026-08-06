import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { DEFAULT_TRUST_RULES } from "@/lib/format";
import type { TrustRules } from "@/lib/types";

export const DEFAULT_TRANSPARENCY_NOTE =
  "Asar tracks pledges and self-reported impact. We're growing our network of verified partners.";

/**
 * A-M04 / T-04. Trust labels and the transparency note are admin-editable
 * but publicly readable, so the wording a visitor sees is the wording an
 * admin actually set — not a copy hardcoded in two places.
 */
export async function getPublicSettings(): Promise<{
  trustRules: TrustRules;
  transparencyNote: string;
}> {
  const fallback = {
    trustRules: DEFAULT_TRUST_RULES,
    transparencyNote: DEFAULT_TRANSPARENCY_NOTE,
  };

  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["trust_rules", "transparency_note"]);

    if (!data) return fallback;

    const map = new Map(data.map((row) => [row.key as string, row.value]));
    const rules = map.get("trust_rules") as Partial<TrustRules> | undefined;
    const note = map.get("transparency_note");

    return {
      trustRules: {
        ...DEFAULT_TRUST_RULES,
        ...rules,
        labels: { ...DEFAULT_TRUST_RULES.labels, ...rules?.labels },
      },
      transparencyNote: typeof note === "string" ? note : fallback.transparencyNote,
    };
  } catch {
    return fallback;
  }
}
