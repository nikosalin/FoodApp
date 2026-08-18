import Link from "next/link";
import { useTranslation } from "react-i18next";

export function EmptyCart() {
  const { t } = useTranslation("cart");

  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-muted-foreground">{t("cart.emptyLabel")}</p>
      <Link
        href="/menu"
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
      >
        {t("cart.backToMenu")}
      </Link>
    </div>
  );
}
