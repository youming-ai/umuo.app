"use client";

import { ChevronRightIcon } from "lucide-react";
import {
  SettingsCard,
  SettingsRow,
  SettingsRowContent,
  SettingsSection,
} from "@/components/features/settings/SettingsCard";
import {
  TRANSCRIPTION_LANGUAGES,
  useTranscriptionLanguage,
  type TranscriptionLanguageCode,
} from "@/components/layout/contexts/TranscriptionLanguageContext";

export function GeneralSettingsSection() {
  const { language, setLanguage, getLanguageConfig } = useTranscriptionLanguage();
  const currentConfig = getLanguageConfig(language);

  const languageOptions = Object.values(TRANSCRIPTION_LANGUAGES);

  return (
    <SettingsSection title="通用">
      <SettingsCard>
        <SettingsRow>
          <SettingsRowContent 
            title="转录语言" 
            description="选择音频转录时使用的语言"
          />
          <div className="flex items-center gap-2">
            {languageOptions.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as TranscriptionLanguageCode)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg text-2xl
                  transition-all duration-200
                  ${language === lang.code 
                    ? "bg-primary/20 ring-2 ring-primary scale-110" 
                    : "bg-muted/50 hover:bg-muted hover:scale-105"
                  }
                `}
                title={lang.name}
                aria-label={`选择${lang.name}`}
                aria-pressed={language === lang.code}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow>
          <SettingsRowContent title="当前选择" />
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentConfig.flag}</span>
            <span className="settings-value">{currentConfig.name}</span>
          </div>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
