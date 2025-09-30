import { ChevronRightIcon, MinusIcon, PlusIcon } from "lucide-react";
import {
  SettingsCard,
  SettingsRow,
  SettingsRowContent,
  SettingsSection,
} from "@/components/settings/SettingsCard";
import { SettingsButtonGroup } from "@/components/settings/SettingsControls";

interface GeneralSettingsSectionProps {
  fontSize: string;
  loopCount: number;
  showTranslation: boolean;
  onFontSizeChange: (size: string) => void;
  onLoopCountChange: (count: number) => void;
  onToggleTranslation: (checked: boolean) => void;
}

export function GeneralSettingsSection({
  fontSize,
  loopCount,
  onFontSizeChange,
  onLoopCountChange,
}: GeneralSettingsSectionProps) {
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

        <SettingsRow>
          <SettingsRowContent title="字幕大小" />
          <SettingsButtonGroup
            options={[
              { value: "small", label: "小" },
              { value: "medium", label: "中" },
              { value: "large", label: "大" },
            ]}
            value={fontSize}
            onChange={onFontSizeChange}
          />
        </SettingsRow>

        <SettingsRow>
          <SettingsRowContent title="跟读循环" />
          <div className="settings-number-adjuster">
            <button
              type="button"
              className="settings-number-button"
              onClick={() => onLoopCountChange(Math.max(1, loopCount - 1))}
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="settings-number-button"
              onClick={() => onLoopCountChange(Math.min(10, loopCount + 1))}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
