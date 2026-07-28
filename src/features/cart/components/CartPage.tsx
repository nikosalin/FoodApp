"use client";

import Link from "next/link";
import { useCartStore } from "../store/useCartStore";
import { CartItemRow } from "./CartItemRow";
import { CartSummary } from "./CartSummary";
import { EmptyCart } from "./EmptyCart";
import { useTranslation } from "react-i18next";

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const { t } = useTranslation("cart");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-black tracking-wide text-pita">
        {t("cart.title")}
      </h1>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <div>
            {items.map((item) => (
              <CartItemRow key={item.id} {...item} />
            ))}
          </div>

          <div className="mt-6">
            <CartSummary items={items} />
          </div>

          <Link
            href="/checkout"
            className="mt-6 block w-full rounded-full bg-chili py-3 text-center font-semibold text-pita hover:bg-chili/90"
          >
            {t("cart.checkoutButton")}
          </Link>
        </>
      )}
    </div>
  );
}
