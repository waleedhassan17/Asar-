"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { updateProfileAction, type SettingsState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function SettingsForm({
  displayName,
  birthday,
}: {
  displayName: string;
  birthday: string | null;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="space-y-5">
      <Field label="Your name" hint="Shown on your mission pages and in the reveal.">
        <Input name="displayName" defaultValue={displayName} maxLength={60} required />
      </Field>

      <Field
        label="Birthday"
        optional
        hint="Only used to pre-fill the countdown when you start a mission. Never shown to anyone."
      >
        <Input type="date" name="birthday" defaultValue={birthday ?? ""} />
      </Field>

      {state.error ? (
        <p className="rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-success-100 px-4 py-3 text-sm text-success" role="status">
          Saved.
        </p>
      ) : null}

      <SaveButton />
    </form>
  );
}
