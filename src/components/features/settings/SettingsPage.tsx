"use client";

import { FeedbackSection } from "@/components/features/settings/page/FeedbackSection";
import { GeneralSettingsSection } from "@/components/features/settings/page/GeneralSettingsSection";
import { SettingsLayout } from "@/components/features/settings/SettingsLayout";

export default function SettingsPage() {
  return (
    <SettingsLayout>
      <div className="space-y-8">
        <GeneralSettingsSection />
        <FeedbackSection />
      </div>
    </SettingsLayout>
  );
}
