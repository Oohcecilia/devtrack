import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Monitor, Users, ArrowLeftRight,
  QrCode, FileText, UserCog, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/devices", label: "Devices", icon: Monitor },
  { path: "/employees", label: "Employees", icon: Users },
  { path: "/assignments", label: "Assignments", icon: ArrowLeftRight },
  { path: "/scanner", label: "QR Scanner", icon: QrCode },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/users", label: "User Management", icon: UserCog, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground",
        "flex flex-col transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="DevTrack" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold text-sidebar-accent-foreground tracking-tight">DevTrack</h1>
              <p className="text-[11px] text-sidebar-foreground/60 font-medium">Inventory Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[11px] text-sidebar-foreground/40 text-center">DevTrack v1.0</p>
        </div>
      </aside>
    </>
  );
}
