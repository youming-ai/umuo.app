import { ChevronRightIcon } from "lucide-react";
import {
  SettingsCard,
  SettingsRow,
  SettingsRowContent,
  SettingsSection,
} from "@/components/settings/SettingsCard";


export function GeneralSettingsSection() {
  return (
    <SettingsSection title="通用">
      <SettingsCard>
        <SettingsRow>
          <SettingsRowContent title="母语" />
          <div className="flex items-center gap-2">
            <span className="settings-value">中文</span>
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          </div>
        </SettingsRow>

        <SettingsRow>
          <SettingsRowContent title="目标语言" />
          <div className="flex items-center gap-2">
            <span className="settings-value">English</span>
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
          </div>
        </SettingsRow>

        
              </SettingsCard>
    </SettingsSection>
  );
}
