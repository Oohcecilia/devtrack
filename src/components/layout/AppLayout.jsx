import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const pageTitles = {
  "/": "Dashboard",
  "/devices": "Devices",
  "/employees": "Employees",
  "/assignments": "Assignments",
  "/scanner": "QR Scanner",
  "/reports": "Reports",
  "/users": "User Management",
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || "DevTrack";

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
