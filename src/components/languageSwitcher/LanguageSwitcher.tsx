// "use client";

// import Image from "next/image";
// import { useTranslation } from "react-i18next";

// import ukFlag from "@/assets/flags/uk_flag.svg";
// import germanFlag from "@/assets/flags/german_flag.svg";

// export default function LanguageSwitcher() {
//   const { i18n } = useTranslation();

//   const current = i18n.resolvedLanguage ?? i18n.language;

//   function selectLanguage(language: "en" | "de") {
//     window.localStorage.setItem("i18nextLng", language);
//     void i18n.changeLanguage(language);
//   }

//   return (
//     <div className="flex items-center gap-2 rounded-full bg-secondary-foreground/20 p-1">
//       <button
//         onClick={() => selectLanguage("en")}
//         className={`rounded-full p-1 transition ${
//           current === "en" ? "bg-white shadow" : "opacity-60 hover:opacity-100"
//         }`}
//         aria-label="English"
//       >
//         <Image src={ukFlag} alt="English" width={24} height={24} />
//       </button>

//       <button
//         onClick={() => selectLanguage("de")}
//         className={`rounded-full p-1 transition ${
//           current === "de" ? "bg-white shadow" : "opacity-60 hover:opacity-100"
//         }`}
//         aria-label="Deutsch"
//       >
//         <Image src={germanFlag} alt="Deutsch" width={24} height={24} />
//       </button>
//     </div>
//   );
// }
"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import ukFlag from "@/assets/flags/uk_flag.svg";
import germanFlag from "@/assets/flags/german_flag.svg";
import greekFlag from "@/assets/flags/greece_flag.svg";

const LANGUAGES = [
  { code: "en", label: "English", flag: ukFlag },
  { code: "de", label: "Deutsch", flag: germanFlag },
  { code: "gr", label: "Ελληνικά", flag: greekFlag },
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  function selectLanguage(language: (typeof LANGUAGES)[number]["code"]) {
    window.localStorage.setItem("i18nextLng", language);
    void i18n.changeLanguage(language);
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary-foreground/20 p-1">
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => selectLanguage(code)}
          className={`rounded-full p-1 transition ${
            current === code
              ? "bg-white shadow"
              : "opacity-60 hover:opacity-100"
          }`}
          aria-label={label}
        >
          <Image src={flag} alt={label} width={24} height={24} />
        </button>
      ))}
    </div>
  );
}
