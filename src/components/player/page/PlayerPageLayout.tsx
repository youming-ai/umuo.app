import type { ReactNode } from "react";
import Navigation from "@/components/ui/Navigation";

interface PlayerPageLayoutProps {
  subtitleContainerId: string;
  children: ReactNode;
  footer?: ReactNode;
  showFooter?: boolean;
}

export function PlayerPageLayout({
  subtitleContainerId,
  children,
  footer,
  showFooter = false,
}: PlayerPageLayoutProps) {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <header className="fixed top-4 left-1/2 z-20 -translate-x-1/2">
        <Navigation />
      </header>

      <main
        id={subtitleContainerId}
        className="flex-1 overflow-y-auto px-4 pb-64 pt-28 sm:px-10 md:px-20 lg:px-40"
      >
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {showFooter && footer ? footer : null}
    </div>
  );
}
