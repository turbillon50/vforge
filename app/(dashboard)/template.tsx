// Pass-through template. The page transition animation lives in
// `components/vforge/app-shell.tsx` (the OS-style viewport). Running a
// second motion layer here caused double-animation on every route change
// — visibly janky on mobile and could leave pages stuck off-screen if
// the spring was interrupted mid-flight.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}
