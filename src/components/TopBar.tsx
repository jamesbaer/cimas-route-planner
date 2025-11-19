import { LanguageSwitcher } from "./LanguageSwitcher";
import { ModeToggle } from "./ModeToggle";

export default function TopBar() {
  return (
    <div className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/images/Logo only_Cimas.png" 
            alt="CIMAS Route Planner" 
            className="h-8 w-auto"
            onError={(e) => {
              // Fallback to text if logo not found
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="hidden text-sm font-medium text-foreground">
            CIMAS Route Planner
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}
