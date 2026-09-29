import { Link } from "@tanstack/react-router";
import { BellRing, ClipboardList, Map } from "lucide-react";

const LINKS = [
  { to: "/", label: "Map & risk", Icon: Map },
  { to: "/alerts", label: "Alerts", Icon: BellRing },
  { to: "/reports", label: "Field reports", Icon: ClipboardList },
] as const;

/** Primary navigation shared by every page of the prototype workflow. */
export function AppNav({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Main navigation" className={`flex items-center gap-1 ${className}`}>
      {LINKS.map(({ to, label, Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          activeProps={{ className: "bg-secondary text-primary" }}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );
}
