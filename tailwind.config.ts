import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        jira: {
          blue: "hsl(var(--jira-blue))",
          "blue-light": "hsl(var(--jira-blue-light))",
          "blue-hover": "hsl(var(--jira-blue-hover))",
          green: "hsl(var(--jira-green))",
          "green-light": "hsl(var(--jira-green-light))",
          yellow: "hsl(var(--jira-yellow))",
          "yellow-light": "hsl(var(--jira-yellow-light))",
          red: "hsl(var(--jira-red))",
          "red-light": "hsl(var(--jira-red-light))",
          purple: "hsl(var(--jira-purple))",
          "purple-light": "hsl(var(--jira-purple-light))",
          orange: "hsl(var(--jira-orange))",
          "orange-light": "hsl(var(--jira-orange-light))",
        },
        issue: {
          story: "hsl(var(--issue-story))",
          bug: "hsl(var(--issue-bug))",
          task: "hsl(var(--issue-task))",
          epic: "hsl(var(--issue-epic))",
          spike: "hsl(var(--issue-spike))",
        },
        priority: {
          highest: "hsl(var(--priority-highest))",
          high: "hsl(var(--priority-high))",
          medium: "hsl(var(--priority-medium))",
          low: "hsl(var(--priority-low))",
          lowest: "hsl(var(--priority-lowest))",
        },
        status: {
          todo: "hsl(var(--status-todo))",
          progress: "hsl(var(--status-progress))",
          review: "hsl(var(--status-review))",
          done: "hsl(var(--status-done))",
        },
        board: {
          column: "hsl(var(--board-column-bg))",
          "column-header": "hsl(var(--board-column-header))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
      fontSize: {
        "2xs": "0.6875rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
