import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        vaa: {
          navy: "#062B49",
          navyDeep: "#052846",
          gold: "#D6B14A",
          bg: "#F4F7FB",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        card: "22px"
      }
    }
  },
  plugins: []
};

export default config;
