"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function Logo() {
  const { t } = useTranslation("home");

  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="text-2xl font-black tracking-tight text-lemon">
        {t("navbar.Logo")}
      </span>
    </Link>
  );
}
