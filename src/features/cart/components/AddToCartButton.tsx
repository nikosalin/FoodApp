"use client";

import { Plus } from "lucide-react";
import { useCartStore } from "../store/useCartStore";
import { AddToCartButtonProps } from "../types";
import { useTranslation } from "react-i18next";

export function AddToCartButton({ id, name, price }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useTranslation("menu");

  return (
    <button
      onClick={() => addItem({ id, name, price })}
      className="flex shrink-0 items-center gap-1 rounded-full bg-lemon px-3 py-1.5 text-xs font-semibold text-char transition-colors hover:bg-lemon/90"
      aria-label={`Add ${name} to cart`}
    >
      <Plus className="h-3.5 w-3.5" />
      {t("addButton")}
    </button>
  );
}
