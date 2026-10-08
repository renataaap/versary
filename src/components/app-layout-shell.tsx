"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import LoginIntro from "@/components/ui/LoginIntro";
import { getLoggedInUser, subscribeToAuthChanges } from "@/lib/client-auth";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [introActive, setIntroActive] = useState(true);
  const content = useRef<HTMLDivElement>(null);
  const loggedUser = useSyncExternalStore(subscribeToAuthChanges, getLoggedInUser, () => null);
  const isAuthPage = pathname === "/login";

  useEffect(() => {
    if (!introActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [introActive]);

  useEffect(() => {
    if (introActive) return;
    if (isAuthPage && loggedUser) {
      router.replace("/dashboard");
      return;
    }
    const focusTarget = isAuthPage
      ? content.current?.querySelector<HTMLInputElement>('input[name="username"]')
      : content.current;
    focusTarget?.focus({ preventScroll: true });
  }, [introActive, isAuthPage, loggedUser, router]);

  return (
    <>
      <LoginIntro onFinish={() => setIntroActive(false)} />
      <div ref={content} tabIndex={-1} inert={introActive} aria-hidden={introActive || undefined}>
        {isAuthPage ? children : <AppShell>{children}</AppShell>}
      </div>
    </>
  );
}
