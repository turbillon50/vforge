import ForgeLoader from "@/components/forge/ForgeLoader";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#ffffff" }}>
      <div className="pointer-events-none fixed inset-x-0 top-0" style={{ height: "2px", background: "#000000" }} aria-hidden />
      <ForgeLoader />
    </div>
  );
}
