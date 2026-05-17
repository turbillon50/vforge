export function VWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute left-1/2 top-[-8%] -translate-x-1/2 select-none font-black leading-none"
        style={{
          fontSize: "clamp(20rem, 70vw, 60rem)",
          backgroundImage:
            "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(34,211,238,0.04) 60%, transparent 90%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
          filter: "blur(40px)",
        }}
      >
        V
      </div>
    </div>
  );
}
