import { applyHostFonts } from "@modelcontextprotocol/ext-apps";

/**
 * Aesthetic Typography Presets supported via MCP Apps SDK applyHostFonts.
 * Replaced quirky wide fonts with ultra-clean, high-end geometric typography:
 * - Plus Jakarta Sans & Outfit: Modern, balanced, razor-sharp geometric aesthetic
 * - Space Grotesk: Clean tech-industrial aesthetic
 * - Instrument Serif: Handcrafted editorial italic accent
 */
export const FONT_PRESETS = {
  modern: {
    name: "Plus Jakarta Sans & Outfit (Clean Aesthetic)",
    css: `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Outfit:wght@600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-hero: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
}

.mcp-hero-title {
  font-family: var(--font-hero, 'Plus Jakarta Sans', 'Outfit', sans-serif) !important;
  letter-spacing: -0.03em;
  font-weight: 800;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
`
  },
  tech: {
    name: "Space Grotesk (Tech Aesthetic)",
    css: `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-display: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif;
  --font-hero: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
}

.mcp-hero-title {
  font-family: var(--font-hero, 'Space Grotesk', sans-serif) !important;
  letter-spacing: -0.035em;
  font-weight: 700;
}
`
  }
};

export const AESTHETIC_HOST_FONTS_CSS = FONT_PRESETS.modern.css;

/**
 * Idempotently inject host-provided font styles into the document head
 * using the official MCP Apps SDK applyHostFonts method.
 */
export function initMcpFonts(presetKey = "modern", customCss = null) {
  if (typeof window === "undefined") return;
  const fontCss = customCss || FONT_PRESETS[presetKey]?.css || AESTHETIC_HOST_FONTS_CSS;
  try {
    // If style already exists, update textContent for hot changes
    const existing = document.getElementById("__mcp-host-fonts");
    if (existing) {
      existing.textContent = fontCss;
      return;
    }
    applyHostFonts(fontCss);
  } catch (err) {
    const styleId = "__mcp-host-fonts";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = fontCss;
  }
}
