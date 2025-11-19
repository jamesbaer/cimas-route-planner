import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import { useInputs } from "../store";
import { useT } from "../i18n";

export default function AppHeader() {
  const { language, setLanguage, theme, setTheme } = useInputs();
  const t = useT(language);

  return (
    <header className="w-full mb-4 flex items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("language")}</span>
        <Select value={language} onValueChange={(v: "en"|"es") => setLanguage(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="en">{t("english")}</SelectItem>
            <SelectItem value="es">{t("spanish")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="outline"
        className="h-9 w-9 p-0 border"
        aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
