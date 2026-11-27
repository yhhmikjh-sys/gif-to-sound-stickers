import { Link } from "@tanstack/react-router";

export function TopNav() {
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-5">
      <Link to="/" className="font-display text-2xl text-foreground">StikDesi</Link>
      <div className="flex gap-2 text-sm font-semibold">
        <Link to="/" className="rounded-full px-3 py-1.5" inactiveProps={{ className: "text-foreground" }} activeProps={{ className: "bg-foreground text-background" }} activeOptions={{ exact: true }}>Home</Link>
        <Link to="/explore" search={{ q: "" }} className="rounded-full px-3 py-1.5" inactiveProps={{ className: "text-foreground" }} activeProps={{ className: "bg-foreground text-background" }}>Public stickers</Link>
      </div>
    </nav>
  );
}
