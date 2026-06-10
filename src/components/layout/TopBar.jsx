import { Menu, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function TopBar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-3 bg-background/80 backdrop-blur-xl border-b border-border sm:px-4 md:px-6">
      <div className="min-w-0 flex items-center gap-2 sm:gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 lg:hidden" 
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
      </div>
      <div className="shrink-0 flex items-center gap-1 sm:gap-2">
        {user?.username && (
          <span className="hidden sm:inline text-sm font-medium text-muted-foreground">
            {user.username}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          className="rounded-full"
          title="Toggle theme"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => logout()}
          className="rounded-full text-muted-foreground hover:text-foreground"
          title="Log out"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
