import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useInputs } from "../store";
import { useT } from "../i18n";

export function LanguageSwitcher() {
  const { language, setLanguage } = useInputs();
  const t = useT(language);

  return (
    <Select value={language} onValueChange={(v: "en"|"es") => setLanguage(v)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent 
        align="end"
        sideOffset={8}
        className="z-[60] bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 border border-gray-200 dark:border-gray-800 shadow-lg rounded-md p-1
                   data-[state=open]:animate-in data-[state=closed]:animate-out
                   data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        avoidCollisions={false}
      >
        <SelectItem value="en">{t("english")}</SelectItem>
        <SelectItem value="es">{t("spanish")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
