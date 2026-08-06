import type { DaySchedule, StoreInfo } from "../types";

export const storeInfo: StoreInfo = {
  phone: "2310.000000",
  addressLines: ["Subbelrather Str. 117", "50825 Cologne"],
};

export const storeHours: DaySchedule[] = [
  { dayKey: "monday", open: "12:00", close: "22:00" },
  { dayKey: "tuesday", open: null, close: null },
  { dayKey: "wednesday", open: "12:00", close: "22:00" },
  { dayKey: "thursday", open: "12:00", close: "22:00" },
  { dayKey: "friday", open: "12:00", close: "22:00" },
  { dayKey: "saturday", open: "12:00", close: "22:00" },
  { dayKey: "sunday", open: "12:00", close: "22:00" },
];
