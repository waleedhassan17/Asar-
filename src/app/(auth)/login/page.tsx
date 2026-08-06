import type { Metadata } from "next";
import { SignInForm } from "../auth-form";
import { SetupNotice } from "@/components/site/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { next } = await props.searchParams;
  return <SignInForm next={typeof next === "string" ? next : "/dashboard"} />;
}
