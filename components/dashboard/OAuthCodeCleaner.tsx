"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function OAuthCodeCleaner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("code")) {
      router.replace("/dashboard");
    }
  }, []);

  return null;
}
