import { useTranslation } from "react-i18next";
import type { DaySchedule } from "../types";

export function StoreHoursRow({ dayKey, open, close }: DaySchedule) {
  const { t } = useTranslation("home");
  const isClosed = !open || !close;

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-pita/80">{t(`hours.days.${dayKey}`)}</span>
      <span className={isClosed ? "text-tomato" : "text-pita"}>
        {isClosed ? t("hours.closed") : `${open}–${close}`}
      </span>
    </div>
  );
}
