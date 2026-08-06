import { storeHours } from "../data/store-info";
import { StoreHoursRow } from "./StoreHoursRow";

export function StoreHoursList() {
  return (
    <div>
      {storeHours.map((day) => (
        <StoreHoursRow key={day.dayKey} {...day} />
      ))}
    </div>
  );
}
