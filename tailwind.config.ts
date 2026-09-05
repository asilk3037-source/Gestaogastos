import type { Config } from "tailwindcss";

// Paleta "macOS" (Aqua / Big Sur+): cinza claro de sistema, cartões brancos,
// azul de sistema como cor de destaque, cores de acento vivas para ícones.
// Os nomes de token (base-*, brand-*, good/warn/bad/info, slate-*) são os
// mesmos usados em todo o app — só os valores mudaram — para re-pintar a UI
// inteira sem reescrever className em cada componente.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Superfícies (do fundo da janela ao branco dos cartões).
        base: {
          950: "#eceef1", // fundo do "papel de parede" atrás da janela
          900: "#ffffff", // cartões / conteúdo
          850: "#fbfbfc", // sidebar (levemente distinta do conteúdo, como o Finder)
          800: "#f2f2f5", // preenchimento de inputs, hover
          700: "#e5e5ea", // trilho de progresso, divisores fortes
          600: "#d1d1d6",
          border: "rgba(0,0,0,0.09)",
        },
        // Reaproveita a escala "slate" (texto) só que invertida: nas páginas,
        // slate-100 sempre foi o texto mais forte e slate-500 o mais fraco —
        // aqui isso vira preto->cinza-claro em vez de branco->cinza-escuro.
        slate: {
          50: "#000000",
          100: "#1d1d1f",
          200: "#2c2c2e",
          300: "#3a3a3c",
          400: "#68686d",
          500: "#8a8a8e",
          600: "#aeaeb2",
          700: "#c7c7cc",
          800: "#d1d1d6",
          900: "#e5e5ea",
          950: "#f2f2f7",
        },
        brand: {
          DEFAULT: "#0a84ff", // azul de sistema macOS
          light: "#409cff",
          dark: "#0060df",
          soft: "#e8f1ff",
        },
        good: "#30d158",
        warn: "#ff9f0a",
        bad: "#ff3b30",
        info: "#32ade6",
        // Botões de janela (semáforo) de um app Mac.
        traffic: {
          red: "#ff5f57",
          yellow: "#febc2e",
          green: "#28c840",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03), 0 10px 20px -14px rgba(0,0,0,0.18)",
        window: "0 30px 60px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)",
        dock: "0 10px 30px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
      },
      borderRadius: {
        xl2: "1.5rem",
        window: "1.35rem",
      },
    },
  },
  plugins: [],
};

export default config;
