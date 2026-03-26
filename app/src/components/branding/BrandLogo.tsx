import { cn } from "../../lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

const logoFetchPriority = { fetchpriority: "high" } as Record<string, string>;

export default function BrandLogo({
  className,
  imageClassName,
  textClassName,
  showText = true,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="inline-flex rounded-full bg-black/25 p-1 ring-1 ring-white/20 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">
        <img
          {...logoFetchPriority}
          src="/branding/ecotrack-logo-96.png"
          srcSet="/branding/ecotrack-logo-96.png 1x, /branding/ecotrack-logo-192.png 2x"
          sizes="40px"
          alt="EcoTrack logo"
          className={cn("h-10 w-10 object-contain", imageClassName)}
          decoding="async"
        />
      </span>
      {showText ? <span className={cn("font-semibold", textClassName)}>EcoTrack</span> : null}
    </span>
  );
}
