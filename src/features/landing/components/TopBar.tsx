// "use client";

// import Link from "next/link";
// import { Clock, Phone } from "lucide-react";
// import { storeInfo } from "../data/store-info";
// import { useTranslation } from "react-i18next";

// export function TopBar() {
//   const { t } = useTranslation("food");

//   return (
//     <div className="hidden items-center justify-between bg-olive px-4 py-2 text-xs text-pita md:flex">
//       <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
//         <div className="flex items-center gap-6">
//           {/* <span className="flex items-center gap-1.5">
//             <Clock className="h-3.5 w-3.5" />
//             {storeInfo.hours}
//           </span> */}
//           <span className="flex items-center gap-1.5">
//             <Phone className="h-3.5 w-3.5" />
//             {storeInfo.phone}
//           </span>
//         </div>

//         <Link
//           href="/menu"
//           className="rounded-full bg-lemon px-4 py-1.5 font-semibold text-char transition-colors hover:bg-lemon/90"
//         >
//           {t("orderButton.label")}
//         </Link>
//       </div>
//     </div>
//   );
// }
