"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

// A real bcrypt hash of a random string, compared against when the email is wrong
// so that response time does not reveal whether the email exists.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Q0pJ0e0eqZ4Y7yXq0E8pYk6kqj1G7e";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!adminEmail || !hash || !process.env.AUTH_SECRET) {
    return { error: "Login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and AUTH_SECRET (see README)." };
  }

  const emailOk = email === adminEmail;
  const passOk = await bcrypt.compare(password, emailOk ? hash : DUMMY_HASH).catch(() => false);
  if (!emailOk || !passOk) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "Incorrect email or password." };
  }
  await createSession(adminEmail);
  redirect("/dashboard");
}
