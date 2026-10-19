/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command, mode, isPreview }) => {
  // A build without the key still works, but AI Suggestions never arrive. Say so before it gets deployed.
  if (command === "build" && !loadEnv(mode, process.cwd()).VITE_GEMINI_API_KEY) {
    console.warn("\nVITE_GEMINI_API_KEY is not set: this build has no AI Suggestions (see .env.example).\n");
  }

  return {
    plugins: [
      react(),
      // Phones open the dev server by its LAN address, and the camera, microphone and crypto.randomUUID
      // only work on a secure page. The certificate is self-signed, so each phone accepts a warning once.
      // Not for the preview: it opens on localhost, which is already secure.
      command === "serve" && !isPreview && basicSsl({ name: "home-check-dev" }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png", "favicon.ico"],
        manifest: {
          name: "Home Check",
          short_name: "Home Check",
          description: "Record the condition of a rental Unit at Move-in and Move-out.",
          theme_color: "#0a101a",
          background_color: "#f8fafc",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        },
      }),
    ],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
