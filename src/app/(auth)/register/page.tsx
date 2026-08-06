import type { Metadata } from "next";
import { SignUpForm } from "../auth-form";
import { SetupNotice } from "@/components/site/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // New accounts land on the dashboard, the same place signing in goes.
  // Its empty state already invites the first mission, so /create is one
  // step further than a brand-new visitor has asked to go.
  const { next } = await props.searchParams;
  return <SignUpForm next={typeof next === "string" ? next : "/dashboard"} />;
}
