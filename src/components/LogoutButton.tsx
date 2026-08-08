"use client";

import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  variant?: "default" | "sidebar";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const className =
    variant === "sidebar"
      ? "w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
      : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100";

  return (
    <button type="button" onClick={handleLogout} className={className}>
      Log out
    </button>
  );
}
