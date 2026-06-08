import Image from "next/image";

const ICONS = {
  chat: "/icons3d/chat.png",
  dashboard: "/icons3d/dashboard.png",
  repovision: "/icons3d/repovision.png",
  blueprint: "/icons3d/blueprint.png",
  integrations: "/icons3d/integrations.png",
  projects: "/icons3d/projects.png",
  rocket: "/icons3d/rocket.png",
  brain: "/icons3d/brain.png",
  shop: "/icons3d/shop.png",
  settings: "/icons3d/settings.png",
  bell: "/icons3d/bell.png",
  analytics: "/icons3d/analytics.png",
} as const;

export type Icon3DName = keyof typeof ICONS;

export function Icon3D({
  name,
  size = 28,
  className = "",
  glow = false,
}: {
  name: Icon3DName;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={"relative inline-flex shrink-0 items-center justify-center " + className}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-60 blur-md"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.6), transparent 70%)" }}
        />
      )}
      <Image
        src={ICONS[name]}
        alt=""
        width={size}
        height={size}
        className="relative z-10 object-contain drop-shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
        unoptimized
      />
    </span>
  );
}
