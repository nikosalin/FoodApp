"use client";

import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCartStore } from "../store/useCartStore";
import { AddToCartButtonProps } from "../types";
import { useTranslation } from "react-i18next";

export function AddToCartButton({
  id,
  name,
  description,
  price,
  restaurantId,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useTranslation("menu");
  const [open, setOpen] = useState(false);
  const ingredients = useMemo(() => ingredientList(description), [description]);
  const [excluded, setExcluded] = useState<string[]>([]);

  function addCustomizedItem() {
    const sortedExcluded = [...excluded].sort();
    addItem(
      {
        id: crypto.randomUUID(),
        menuItemId: id,
        name,
        price,
        excludedIngredients: sortedExcluded,
      },
      restaurantId,
    );
    setOpen(false);
    setExcluded([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 rounded-3xl focus:outline-none"
        aria-label={`${t("customize.open")} ${name}`}
      />

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-end bg-char/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`customize-${id}`}
              className="max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#fffaf2] p-6 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-8"
            >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-tomato">
                  {t("customize.eyebrow")}
                </p>
                <h2 id={`customize-${id}`} className="mt-2 text-3xl font-black uppercase text-char">
                  {name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-char/60">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-char/5 text-char hover:bg-char/10"
                aria-label={t("customize.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {ingredients.length > 0 ? (
              <div className="mt-7">
                <p className="text-sm font-bold text-char">{t("customize.included")}</p>
                <p className="mt-1 text-xs text-char/55">{t("customize.hint")}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ingredients.map((ingredient) => {
                    const included = !excluded.includes(ingredient);
                    return (
                      <button
                        key={ingredient}
                        type="button"
                        aria-pressed={included}
                        onClick={() =>
                          setExcluded((current) =>
                            included
                              ? [...current, ingredient]
                              : current.filter((item) => item !== ingredient),
                          )
                        }
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          included
                            ? "border-olive/30 bg-white text-char"
                            : "border-tomato/20 bg-tomato/5 text-char/45 line-through"
                        }`}
                      >
                        {ingredient}
                        <span className={`grid h-6 w-6 place-items-center rounded-full ${included ? "bg-olive text-white" : "bg-char/10"}`}>
                          {included && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-7 rounded-2xl bg-char/5 p-4 text-sm text-char/60">
                {t("customize.noOptions")}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-5 border-t border-char/10 pt-6">
              <span className="text-2xl font-black text-tomato">€ {price.toFixed(2)}</span>
              <button
                type="button"
                onClick={addCustomizedItem}
                className="flex items-center gap-2 rounded-xl bg-tomato px-6 py-3 font-black uppercase tracking-wide text-white transition hover:bg-char"
              >
                <Plus className="h-4 w-4" />
                {t("customize.add")}
              </button>
            </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

function ingredientList(description: string) {
  const normalized = description
    .replace(/[.;]$/g, "")
    .split(/,|\s+und\s+|\s+and\s+/i)
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient.length >= 2 && ingredient.length <= 50);
  return normalized.length >= 2 ? [...new Set(normalized)].slice(0, 10) : [];
}
