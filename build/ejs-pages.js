import path from "node:path";
import ejs from "ejs";

/**
 * Vite plugin: renders every HTML page through EJS before Vite parses it,
 * so the header, footer and cards live in shared partials.
 */
export function ejsPages({ views, data }) {
  return {
    name: "coinfolio:ejs-pages",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const page = path.basename(ctx.filename, ".html");
        return ejs.render(html, { ...data, page }, { filename: ctx.filename, views: [views] });
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".ejs") || file.includes("src/data")) {
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}
