import { applyHostFonts } from "@modelcontextprotocol/ext-apps";

/**
 * Aesthetic Typography CSS for MCP Apps and Modern Industrial Design.
 * Injects modern aesthetic Google Fonts (@import) and configures host typography variables:
 * - Syne: Award-winning sculptural, geometric modern aesthetic font
 * - Space Grotesk: Clean modern tech aesthetic
 * - Outfit: Geometric minimalist display font
 * - Plus Jakarta Sans: Modern neo-grotesque interface font
 * - Instrument Serif: Editorial italic serif accent
 */
export const AESTHETIC_HOST_FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Space+Grotesk:wght@600;700&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Syne', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans', sans-serif;
  --font-hero: 'Syne', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans', sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
}

.mcp-hero-title {
  font-family: var(--font-hero, var(--font-display, 'Syne', 'Outfit', sans-serif)) !important;
  letter-spacing: -0.04em;
  font-weight: 800;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
`;

/**
 * Idempotently inject host-provided font styles into the document head
 * using the official MCP Apps SDK applyHostFonts method.
 */
export function initMcpFonts(customFontCss = AESTHETIC_HOST_FONTS_CSS) {
  if (typeof window === "undefined") return;
  try {
    applyHostFonts(customFontCss);
  } catch (err) {
    // In restricted or JSDOM environments, ensure fallback style injection
    const styleId = "__mcp-host-fonts";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = customFontCss;
      document.head.appendChild(style);
    }
  }
}
