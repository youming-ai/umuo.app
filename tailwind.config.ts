import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
    theme: {
    extend: {
      colors: {
        // 品牌色系统
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        // 主色调
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
        },
        // 语义色
        success: {
          DEFAULT: "var(--state-success-text)",
          surface: "var(--state-success-surface)",
          border: "var(--state-success-border)",
          strong: "var(--state-success-strong)",
        },
        warning: {
          DEFAULT: "var(--state-warning-text)",
          surface: "var(--state-warning-surface)",
          border: "var(--state-warning-border)",
          strong: "var(--state-warning-strong)",
        },
        error: {
          DEFAULT: "var(--state-error-text)",
          surface: "var(--state-error-surface)",
          border: "var(--state-error-border)",
          strong: "var(--state-error-strong)",
        },
        info: {
          DEFAULT: "var(--state-info-text)",
          surface: "var(--state-info-surface)",
          border: "var(--state-info-border)",
          strong: "var(--state-info-strong)",
        },
        // 背景色
        background: {
          DEFAULT: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          surface: "var(--bg-surface)",
          inverse: "var(--bg-inverse)",
        },
        // 文字颜色
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        // 边框颜色
        border: {
          DEFAULT: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          muted: "var(--border-muted)",
          focus: "var(--border-focus)",
          error: "var(--border-error)",
        },
        // 表面颜色
        surface: {
          DEFAULT: "var(--surface-card)",
          base: "var(--surface-base)",
          muted: "var(--surface-muted)",
          inverse: "var(--surface-inverse)",
        },
        // 卡片颜色
        card: {
          DEFAULT: "var(--surface-card)",
          dark: "var(--surface-card)",
        },
        // 播放器专用颜色
        player: {
          accent: "var(--player-accent-color)",
          highlight: "var(--player-highlight-bg)",
          track: "var(--player-track-color)",
          thumb: {
            fill: "var(--player-thumb-fill)",
            border: "var(--player-thumb-border)",
          },
          hover: "var(--player-hover-indicator)",
          tooltip: "var(--player-tooltip-text)",
        },
      },
      // 扩展间距令牌
      spacing: {
        "card-sm": "var(--space-card-padding-sm)",
        "card-lg": "var(--space-card-padding-lg)",
        "section": "var(--space-section-gap)",
      },
      // 扩展圆角令牌
      borderRadius: {
        "card": "var(--radius-card)",
        "card-lg": "var(--radius-card-large)",
        "control": "var(--radius-control)",
      },
      // 扩展阴影令牌
      boxShadow: {
        "theme-sm": "var(--shadow-sm)",
        "theme-md": "var(--shadow-md)",
        "theme-lg": "var(--shadow-lg)",
        "theme-xl": "var(--shadow-xl)",
      },
    },
  },
  plugins: [],
};

export default config;
