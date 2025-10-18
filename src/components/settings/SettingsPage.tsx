"use client";

import { FeedbackSection } from "@/components/settings/page/FeedbackSection";
import { GeneralSettingsSection } from "@/components/settings/page/GeneralSettingsSection";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

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
