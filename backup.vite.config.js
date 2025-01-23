import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import crossOriginIsolation from "vite-plugin-cross-origin-isolation";
import { VitePWA } from "vite-plugin-pwa";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import OMT from "@surma/rollup-plugin-off-main-thread";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // Enable in development mode if needed
      },
      manifest: {
        name: "Wobbegong explorer",
        short_name: "WobExp",
        description: "Explore datasets from Wobbegong",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          // Add more icons as needed
        ],
      },
      workbox: {
        // Configure Workbox options here if necessary
      },
    }),
    // crossOriginIsolation(),
    // {
    //   name: "configure-response-headers",
    //   configureServer: (server) => {
    //     server.middlewares.use((_req, res, next) => {
    //       res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    //       res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    //       next();
    //     });
    //   },
    // },
  ],
  // worker: {
  //   plugins: [resolve(), OMT()],
  // },
  build: {
    rollupOptions: {
      plugins: [resolve(), commonjs(), OMT()],
    },
  },
  optimizeDeps: {
    exclude: ["epiviz.gl"]
  }
});
