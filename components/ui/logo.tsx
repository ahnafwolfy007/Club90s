import Image from "next/image";

/**
 * The club crest is dark artwork with gold linework — on the app's black
 * background it would disappear, so it always sits on a white plate.
 */
export function Logo({ size = 72, className = "" }: { size?: number; className?: string }) {
  const padding = Math.round(size * 0.1);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white ${className}`}
      style={{ padding }}
    >
      <Image
        src="/logo.png"
        alt="CLUB 90s"
        width={size}
        height={Math.round((size * 545) / 458)}
        priority
      />
    </span>
  );
}
