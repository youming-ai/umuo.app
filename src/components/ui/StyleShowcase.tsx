"use client";

import { useState } from "react";

export default function StyleShowcase() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'dark' : ''}`}>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Theme Toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">UI Style Showcase</h1>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Button Showcase */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Button Variants</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary Buttons */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Primary Buttons</h3>
              <div className="space-y-3">
                <button className="btn-primary w-full">
                  Primary Button
                </button>
                <button className="btn-primary w-full" disabled>
                  Disabled Primary
                </button>
                <button className="btn-primary btn-icon">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Secondary Buttons</h3>
              <div className="space-y-3">
                <button className="btn-secondary w-full">
                  Secondary Button
                </button>
                <button className="btn-secondary w-full" disabled>
                  Disabled Secondary
                </button>
                <button className="btn-secondary btn-icon">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>

            {/* Outline Buttons */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Outline Buttons</h3>
              <div className="space-y-3">
                <button className="btn-outline w-full">
                  Outline Button
                </button>
                <button className="btn-outline w-full" disabled>
                  Disabled Outline
                </button>
                <button className="btn-outline btn-icon">
                  <span className="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Ghost Buttons</h3>
              <div className="space-y-3">
                <button className="btn-ghost w-full">
                  Ghost Button
                </button>
                <button className="btn-ghost w-full" disabled>
                  Disabled Ghost
                </button>
                <button className="btn-ghost btn-icon">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Danger Buttons */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Danger Buttons</h3>
              <div className="space-y-3">
                <button className="btn-danger w-full">
                  Danger Button
                </button>
                <button className="btn-danger w-full" disabled>
                  Disabled Danger
                </button>
                <button className="btn-danger btn-icon">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>

            {/* Icon Sizes */}
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-4">Icon Button Sizes</h3>
              <div className="flex justify-center gap-3 items-center">
                <button className="btn-primary btn-icon btn-icon-sm">
                  <span className="material-symbols-outlined">home</span>
                </button>
                <button className="btn-primary btn-icon">
                  <span className="material-symbols-outlined">home</span>
                </button>
                <button className="btn-primary btn-icon btn-icon-lg">
                  <span className="material-symbols-outlined">home</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Card Showcase */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Card Variants</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Card */}
            <div className="card-default">
              <h3 className="text-xl font-semibold mb-2">Default Card</h3>
              <p className="text-secondary mb-4">
                Standard card with bottom border emphasis and moderate shadow.
              </p>
              <button className="btn-primary btn-icon-sm">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            {/* Elevated Card */}
            <div className="card-elevated">
              <h3 className="text-xl font-semibold mb-2">Elevated Card</h3>
              <p className="text-secondary mb-4">
                Higher elevation with stronger shadow and thicker bottom border.
              </p>
              <button className="btn-primary btn-icon-sm">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            {/* Bordered Card */}
            <div className="card-bordered">
              <h3 className="text-xl font-semibold mb-2">Bordered Card</h3>
              <p className="text-secondary mb-4">
                Emphasis on borders with subtle shadow and strong border colors.
              </p>
              <button className="btn-primary btn-icon-sm">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            {/* Interactive Card */}
            <div className="card-interactive">
              <h3 className="text-xl font-semibold mb-2">Interactive Card</h3>
              <p className="text-secondary mb-4">
                Fully interactive with enhanced hover effects and cursor pointer.
              </p>
              <button className="btn-primary btn-icon-sm">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* Theme Comparison */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Theme-Specific Features</h2>

          <div className="space-y-4">
            <div className="card-default">
              <h3 className="text-lg font-semibold mb-3">Shadow Differences</h3>
              <p className="text-secondary mb-4">
                <strong>Light Theme:</strong> More pronounced shadows with lighter opacity for subtle depth.<br/>
                <strong>Dark Theme:</strong> Deeper shadows with higher opacity to create visual separation in dark environments.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button className="btn-primary">Light Theme Shadow</button>
                <button className="btn-primary">Dark Theme Shadow</button>
              </div>
            </div>

            <div className="card-default">
              <h3 className="text-lg font-semibold mb-3">Bottom Border Emphasis</h3>
              <p className="text-secondary mb-4">
                All buttons and cards feature enhanced bottom borders (4-6px) that provide visual weight and depth.
                In active states, the bottom border reduces to 1px to simulate a pressed effect.
              </p>
              <div className="flex gap-3">
                <button className="btn-primary">4px Bottom</button>
                <button className="btn-secondary">4px Bottom</button>
                <button className="btn-outline">4px Bottom</button>
                <button className="btn-danger">4px Bottom</button>
              </div>
            </div>

            <div className="card-default">
              <h3 className="text-lg font-semibold mb-3">Hover Animations</h3>
              <p className="text-secondary mb-4">
                Smooth 200ms transitions with subtle translateY effects for enhanced interactivity.
                Buttons lift slightly on hover, while cards have more pronounced elevation changes.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="card-interactive">
                  <p className="text-sm mb-2">Hover me (card lifts -0.375rem)</p>
                  <button className="btn-ghost">Hover me too (button lifts -0.125rem)</button>
                </div>
                <div className="card-elevated">
                  <p className="text-sm mb-2">Hover me (card lifts -0.5rem)</p>
                  <button className="btn-secondary">Hover me too (button lifts -0.125rem)</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Accessibility Features</h2>

          <div className="card-default">
            <h3 className="text-lg font-semibold mb-3">Focus States</h3>
            <p className="text-secondary mb-4">
              All buttons have enhanced focus states with 2px outline and proper offset for keyboard navigation.
              Tab through the buttons below to see the focus indicators.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="btn-primary">Tab to me 1</button>
              <button className="btn-secondary">Tab to me 2</button>
              <button className="btn-outline">Tab to me 3</button>
              <button className="btn-ghost">Tab to me 4</button>
              <button className="btn-danger">Tab to me 5</button>
            </div>
          </div>

          <div className="card-default">
            <h3 className="text-lg font-semibold mb-3">WCAG Compliance</h3>
            <p className="text-secondary mb-4">
              Enhanced color contrast ratios ensure AA compliance in both light and dark themes.
              Text remains readable with improved contrast ratios (3:1 for large text, 4.5:1 for normal text).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface/10 p-4 rounded">
                <p className="text-sm mb-2">Light Theme Text</p>
                <p className="text-xs text-secondary">Improved contrast ratios</p>
              </div>
              <div className="bg-surface/10 p-4 rounded">
                <p className="text-sm mb-2">Dark Theme Text</p>
                <p className="text-xs text-secondary">Enhanced readability</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}