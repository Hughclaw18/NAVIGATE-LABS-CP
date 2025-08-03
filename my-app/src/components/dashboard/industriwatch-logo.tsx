"use client";

import Image from "next/image";
import Link from "next/link";

export function IndustriWatchLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <Image
        src="/INDUSTRIWATCH_LOGO.png"
        width={32}
        height={32}
        alt="IndustriWatch Logo"
        className="rounded-full"
      />
      <span className="font-semibold text-lg group-data-[state=collapsed]:hidden">
        IndustriWatch
      </span>
    </Link>
  );
} 