"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppLoadingState } from "@/components/app-loading-state";
import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/my-events")}`);
    }
  }, [pathname, router, status]);

  if (status !== "authenticated") {
    return (
      <AppLoadingState
        label="Checking access"
        detail="Confirming your account before opening event management."
      />
    );
  }

  return <>{children}</>;
}
