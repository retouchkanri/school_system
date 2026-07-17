type SiteLogoProps = {
  className?: string;
  height?: number;
};

export default function SiteLogo({ className = "", height = 40 }: SiteLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo.png"
      alt="馬事学院／東関東馬事専門学院"
      className={`w-auto max-w-full object-contain ${className}`}
      style={{ height }}
    />
  );
}
