/**
 * 学习语言设置组件
 * 左侧为母语，右侧为目标语言，支持国旗切换
 */

"use client";

import {
  SettingsCard,
  SettingsRow,
  SettingsRowContent,
  SettingsSection,
} from "@/components/features/settings/SettingsCard";
import {
  SUPPORTED_LANGUAGES,
  TRANSCRIPTION_LANGUAGES,
  useTranscriptionLanguage,
} from "@/components/layout/contexts/TranscriptionLanguageContext";

export function LearningLanguageSection() {
  const { learningLanguage, setLearningLanguage, getSupportedLanguages, getTranscriptionLanguages } =
    useTranscriptionLanguage();
  const supportedLanguages = getSupportedLanguages();
  const transcriptionLanguages = getTranscriptionLanguages();

  const handleNativeLanguageChange = (languageCode: string) => {
    setLearningLanguage({
      ...learningLanguage,
      nativeLanguage: languageCode,
    });
  };

  const handleTargetLanguageChange = (languageCode: string) => {
    setLearningLanguage({
      ...learningLanguage,
      targetLanguage: languageCode,
    });
  };

  return (
    <SettingsSection title="学习语言">
      <SettingsCard>
        {/* 母语语言选择 */}
        <SettingsRow>
          <SettingsRowContent title="母语" description="转录时翻译的目标语言" />
          <div className="flex items-center gap-2">
            {Object.entries(supportedLanguages).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleNativeLanguageChange(code)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg text-2xl
                  transition-all duration-200
                  ${learningLanguage.nativeLanguage === code
                    ? "bg-primary/20 ring-2 ring-primary scale-110"
                    : "bg-muted/50 hover:bg-muted hover:scale-105"
                  }
                `}
                title={config.name}
                aria-label={`选择${config.name}作为母语`}
                aria-pressed={learningLanguage.nativeLanguage === code}
              >
                {config.flag}
              </button>
            ))}
          </div>
        </SettingsRow>

        {/* 目标语言选择 */}
        <SettingsRow>
          <SettingsRowContent title="目标语言" description="转录时API使用的语言参数" />
          <div className="flex items-center gap-2">
            {Object.entries(transcriptionLanguages).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleTargetLanguageChange(code)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg text-2xl
                  transition-all duration-200
                  ${learningLanguage.targetLanguage === code
                    ? "bg-primary/20 ring-2 ring-primary scale-110"
                    : "bg-muted/50 hover:bg-muted hover:scale-105"
                  }
                `}
                title={config.name}
                aria-label={`选择${config.name}作为目标语言`}
                aria-pressed={learningLanguage.targetLanguage === code}
              >
                {config.flag}
              </button>
            ))}
          </div>
        </SettingsRow>

        {/* 当前配置显示 */}
        <SettingsRow>
          <SettingsRowContent title="当前配置" description="左侧为母语，右侧为目标语言" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="text-2xl">
                {supportedLanguages[learningLanguage.nativeLanguage as keyof typeof supportedLanguages]?.flag}
              </span>
              <span>{supportedLanguages[learningLanguage.nativeLanguage as keyof typeof supportedLanguages]?.name}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl">
                {transcriptionLanguages[learningLanguage.targetLanguage as keyof typeof transcriptionLanguages]?.flag}
              </span>
              <span>{transcriptionLanguages[learningLanguage.targetLanguage as keyof typeof transcriptionLanguages]?.name}</span>
            </div>
          </div>
        </SettingsRow>

        {/* 语言提示 */}
        <SettingsRow>
          <SettingsRowContent
            title="提示"
            description="母语用于转录后的翻译，目标语言用于转录识别"
          />
          <div className="text-xs text-muted-foreground">
            <p>• 支持多种主流语言，包括中文、英文、日文、韩文等</p>
            <p>• 目标语言会作为转录API的language参数</p>
            <p> • 系统会自动适配浏览器语言设置</p>
          </div>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
