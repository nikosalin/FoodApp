import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-olive/30 px-4 py-10 text-center">
      <h3 className="text-lg font-bold tracking-wide text-pita">
        ΔΕΣ ΤΟ ΜΕΝΟΥ ΜΑΣ
      </h3>
      <Link
        href="/menu"
        className="mt-4 inline-block rounded-full bg-lemon px-6 py-2 font-semibold text-char transition-colors hover:bg-lemon/90"
      >
        ΜΕΝΟΥ
      </Link>
      <p className="mt-8 text-xs text-pita/50">
        © {new Date().getFullYear()} OPA. All rights reserved.
      </p>
    </footer>
  );
}
