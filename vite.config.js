import { resolve } from "node:path";
import { defineConfig } from "vite";
import { ejsPages } from "./build/ejs-pages.js";
import { site } from "./src/data/site.js";

export default defineConfig({
  base: "./",
  plugins: [ejsPages({ views: resolve("src/templates"), data: site })],
  server: { port: 5173 },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        dashboard: resolve("index.html"),
        assets: resolve("assets.html"),
        asset: resolve("asset.html"),
        profile: resolve("profile.html"),
      },
    },
  },
});
