import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-600 dark:text-zinc-400 sm:flex-row">
        <p>
          Questions?{" "}
          <a href="mailto:hello@jdgapscore.com" className="underline">
            hello@jdgapscore.com
          </a>
        </p>
        <nav className="flex gap-6">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/refunds" className="hover:underline">
            Refunds
          </Link>
        </nav>
      </div>
    </footer>
  );
}
