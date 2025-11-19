import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import { useInputs } from "../store";
import { cn } from "../lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useInputs();

  return (
    <Button
      variant="outline"
      className={cn(
        "h-9 w-9 p-0 transition-colors",
        "border border-border hover:border-foreground/40"
      )}
      aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
