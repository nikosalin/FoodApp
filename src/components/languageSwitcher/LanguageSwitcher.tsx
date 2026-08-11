// "use client";

// import { useEffect, useId, useState } from "react";

// import { DeutschFlag, UkFlag } from "@/assets/flags";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { useTranslation } from "react-i18next";

// export default function LanguageSwitcher() {
//   const { i18n } = useTranslation();
//   const id = useId();
//   const [checked, setChecked] = useState<boolean>(i18n.language === "gr");

//   const handleSwitch = (value: boolean) => {
//     setChecked(value);
//     i18n.changeLanguage(value ? "de" : "en");
//   };

//   useEffect(() => {
//     setChecked(i18n.language === "de");
//   }, [i18n.language]);

//   // return (
//   //   <div>
//   //     <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium">
//   //       <Switch
//   //         id={id}
//   //         checked={checked}
//   //         onCheckedChange={handleSwitch}
//   //         className="peer data-[state=checked]:bg-secondary-foreground/20
//   //   data-[state=unchecked]:bg-secondary-foreground/20 absolute inset-0 h-[inherit] w-auto
//   //   cursor-pointer shadow-md [&>span]:h-full [&>span]:w-1/2 [&>span]:transition-transform
//   //   [&>span]:duration-300 [&>span]:ease-[cubic-bezier(0.16,1,0.3,1)]
//   //   [&>span]:data-[state=checked]:translate-x-full
//   //   [&>span]:data-[state=checked]:rtl:-translate-x-full"
//   //       />
//   //       <span
//   //         className="peer-data-[state=checked]:text-muted-foreground/70 pointer-events-none relative
//   //           ms-0.5 flex min-w-8 items-center justify-center text-center"
//   //       >
//   //         <UkFlag className="h-6 w-6" aria-hidden="true" />
//   //       </span>
//   //       <span
//   //         className="peer-data-[state=unchecked]:text-muted-foreground/70 pointer-events-none
//   //           relative me-0.5 flex min-w-8 items-center justify-center text-center"
//   //       >
//   //         <GreeceFlag className="h-6 w-6" aria-hidden="true" />
//   //       </span>
//   //     </div>
//   //     <Label htmlFor={id} className="sr-only">
//   //       Labeled switch
//   //     </Label>
//   //   </div>
//   // );
//   console.log(UkFlag);
//   console.log(DeutschFlag);
//   return (
//     <div className="relative inline-flex items-center w-[72px] h-9 rounded-full bg-secondary-foreground/20 p-1 shadow-md">
//       {/* Sliding background */}
//       <div
//         className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white shadow transition-transform duration-300
//       ${checked ? "translate-x-full" : "translate-x-0"}`}
//       />

//       {/* Flags */}
//       <div className="relative z-10 flex w-full justify-between px-1">
//         <UkFlag
//           className={`h-5 w-5 ${!checked ? "opacity-100" : "opacity-50"}`}
//         />
//         <DeutschFlag
//           className={`h-5 w-5 ${checked ? "opacity-100" : "opacity-50"}`}
//         />
//       </div>

//       {/* Invisible switch */}
//       <Switch
//         id={id}
//         checked={checked}
//         onCheckedChange={handleSwitch}
//         className="absolute inset-0 z-20 opacity-0 cursor-pointer"
//       />
//     </div>
//   );
// }

"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import ukFlag from "@/assets/flags/uk_flag.svg";
import germanFlag from "@/assets/flags/german_flag.svg";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const current = i18n.resolvedLanguage ?? i18n.language;

  function selectLanguage(language: "en" | "de") {
    window.localStorage.setItem("i18nextLng", language);
    void i18n.changeLanguage(language);
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary-foreground/20 p-1">
      <button
        onClick={() => selectLanguage("en")}
        className={`rounded-full p-1 transition ${
          current === "en" ? "bg-white shadow" : "opacity-60 hover:opacity-100"
        }`}
        aria-label="English"
      >
        <Image src={ukFlag} alt="English" width={24} height={24} />
      </button>

      <button
        onClick={() => selectLanguage("de")}
        className={`rounded-full p-1 transition ${
          current === "de" ? "bg-white shadow" : "opacity-60 hover:opacity-100"
        }`}
        aria-label="Deutsch"
      >
        <Image src={germanFlag} alt="Deutsch" width={24} height={24} />
      </button>
    </div>
  );
}
