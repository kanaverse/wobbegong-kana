import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import crossOriginIsolation from "vite-plugin-cross-origin-isolation";
import { VitePWA } from "vite-plugin-pwa";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import OMT from "@surma/rollup-plugin-off-main-thread";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["epiviz.gl"],
  },
});
