"use client";

import { useState } from "react";
import { FeedbackSection } from "@/components/settings/page/FeedbackSection";
import { GeneralSettingsSection } from "@/components/settings/page/GeneralSettingsSection";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

interface PreferenceState {
  notifications: boolean;
  autoPlay: boolean;
  subtitleEnabled: boolean;
  shadowingEnabled: boolean;
  showTranslation: boolean;
  fontSize: "small" | "medium" | "large" | string;
  loopCount: number;
  playbackSpeed: number;
  nativeLanguage: string;
  targetLanguage: string;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<PreferenceState>({
    notifications: true,
    autoPlay: true,
    subtitleEnabled: true,
    shadowingEnabled: true,
    showTranslation: true,
    fontSize: "medium",
    loopCount: 3,
    playbackSpeed: 1.0,
    nativeLanguage: "zh",
    targetLanguage: "en",
  });

  const updatePreferences = (updates: Partial<PreferenceState>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SettingsLayout>
      <div className="space-y-8">
        <GeneralSettingsSection
          fontSize={preferences.fontSize}
          loopCount={preferences.loopCount}
          showTranslation={preferences.showTranslation}
          onFontSizeChange={(size) => updatePreferences({ fontSize: size })}
          onLoopCountChange={(count) => updatePreferences({ loopCount: count })}
          onToggleTranslation={(checked) => updatePreferences({ showTranslation: checked })}
        />
        <FeedbackSection />
      </div>
    </SettingsLayout>
  );
}
