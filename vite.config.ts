// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Every route is listed so the build writes a static HTML file per route into
// dist/client. That folder is what Capacitor (and any other native wrapper)
// packages as the app's web bundle — see webDir in capacitor.config.ts.
// The app never reads cookies, sessions or per-user data during render, so the
// captured HTML is identical for every visitor and every device.
export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: [
      { path: "/" },
      { path: "/log" },
      { path: "/calendar" },
      { path: "/analysis" },
      { path: "/setups" },
      { path: "/rules" },
      { path: "/settings" },
      { path: "/backup" },
    ],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
  },
});
