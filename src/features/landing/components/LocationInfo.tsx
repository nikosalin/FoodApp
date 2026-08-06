// import { MapPin, Phone, Clock } from "lucide-react";
// import { storeInfo } from "../data/store-info";

// export function LocationInfo() {
//   return (
//     <section className="border-t border-olive/30 bg-pita/5 px-4 py-16">
//       <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
//         <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
//           <Phone className="mb-2 h-5 w-5 text-lemon" />
//           <span className="font-bold text-pita">{storeInfo.phone}</span>
//         </div>

//         <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
//           <Clock className="mb-2 h-5 w-5 text-lemon" />
//           <span className="text-pita/80">{storeInfo.hours}</span>
//         </div>

//         <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
//           <MapPin className="mb-2 h-5 w-5 text-lemon" />
//           {storeInfo.addressLines.map((line) => (
//             <span key={line} className="text-pita/80">
//               {line}
//             </span>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }
"use client";

import { Phone, MapPin, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeInfo } from "../data/store-info";
import { StoreHoursList } from "./StoreHoursList";

export function LocationInfo() {
  const { t } = useTranslation("home");

  return (
    <section className="border-t border-olive/30 bg-pita/5 px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-pita">
            <MapPin className="h-4 w-4 text-lemon" />
            {t("hours.addressTitle")}
          </h3>
          {storeInfo.addressLines.map((line) => (
            <p key={line} className="text-pita/80">
              {line}
            </p>
          ))}
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-pita">
            <Clock className="h-4 w-4 text-lemon" />
            {t("hours.deliveryTitle")}
          </h3>
          <StoreHoursList />
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-pita">
            <Phone className="h-4 w-4 text-lemon" />
            {t("hours.contactTitle")}
          </h3>
          <a
            href={`tel:${storeInfo.phone.replace(/\./g, "")}`}
            className="block text-pita/80 hover:text-lemon"
          >
            {storeInfo.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
