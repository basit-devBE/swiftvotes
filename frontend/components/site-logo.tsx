import Image from "next/image";
import Link from "next/link";

type SiteLogoProps = {
  priority?: boolean;
  className?: string;
};

export function SiteLogo({ priority = false, className = "" }: SiteLogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${className}`}
      aria-label="SwiftVote home"
    >
      <Image
        src="/swiftvote-logo.png"
        alt="SwiftVote"
        width={190}
        height={76}
        priority={priority}
        className="h-14 w-auto sm:h-16"
      />
    </Link>
  );
}
