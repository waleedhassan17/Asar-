import type { Metadata } from "next";
import { SignUpForm } from "../auth-form";
import { SetupNotice } from "@/components/site/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage(props: PageProps<"/register">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { next } = await props.searchParams;
  return <SignUpForm next={typeof next === "string" ? next : "/create"} />;
}
