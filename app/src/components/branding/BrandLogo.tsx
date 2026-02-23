import { cn } from "../../lib/utils";
import ecoTrackLogo from "../../assets/branding/ecotrack-logo.png";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

export default function BrandLogo({
  className,
  imageClassName,
  textClassName,
  showText = true,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="inline-flex rounded-full bg-black/25 p-1 ring-1 ring-white/20 shadow-[0_8px_22px_rgba(0,0,0,0.38)]">
        <img src={ecoTrackLogo} alt="EcoTrack logo" className={cn("h-10 w-10 object-contain", imageClassName)} />
      </span>
      {showText ? <span className={cn("font-semibold", textClassName)}>EcoTrack</span> : null}
    </span>
  );
}
