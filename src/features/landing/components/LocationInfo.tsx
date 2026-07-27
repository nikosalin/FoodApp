import { MapPin, Phone, Clock } from "lucide-react";
import { storeInfo } from "../data/store-info";

export function LocationInfo() {
  return (
    <section className="border-t border-olive/30 bg-pita/5 px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <Phone className="mb-2 h-5 w-5 text-lemon" />
          <span className="font-bold text-pita">{storeInfo.phone}</span>
        </div>

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <Clock className="mb-2 h-5 w-5 text-lemon" />
          <span className="text-pita/80">{storeInfo.hours}</span>
        </div>

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <MapPin className="mb-2 h-5 w-5 text-lemon" />
          {storeInfo.addressLines.map((line) => (
            <span key={line} className="text-pita/80">
              {line}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
