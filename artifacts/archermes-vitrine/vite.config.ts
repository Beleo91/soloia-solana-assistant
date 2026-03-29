import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Prevents Vite from crashing when the Replit proxy sends RSV1-flagged
// (permessage-deflate compressed) WebSocket frames that the ws library
// rejects with WS_ERR_UNEXPECTED_RSV_1.
const wsErrorHandlerPlugin = (): Plugin => ({
  name: 'ws-error-handler',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      const wss = (server.ws as unknown as { wss?: import('ws').WebSocketServer }).wss;
      if (wss) {
        wss.on('connection', (ws) => {
          if (!ws.listenerCount('error')) {
            ws.on('error', () => {});
          }
        });
      }
    });
  },
});

// During Vercel (or any CI) build, PORT and BASE_PATH are not set.
// We only need them for the dev server — the build output doesn't use them.
const isBuildMode = process.env.NODE_ENV === 'production' || !process.env.REPL_ID;

const rawPort = process.env.PORT;

if (!rawPort && !isBuildMode) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort ?? '3000');

if (!isBuildMode && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

// ImgBB key: injected at build time so the browser can upload directly to ImgBB
// without needing the API server as a proxy. Works in both Replit and Vercel —
// just set IMGBB_API_KEY as an environment variable in either platform.
const imgbbKey = process.env.IMGBB_API_KEY ?? '';

export default defineConfig({
  base: basePath,
  define: {
    // Exposed as import.meta.env.VITE_IMGBB_API_KEY in all source files
    'import.meta.env.VITE_IMGBB_API_KEY': JSON.stringify(imgbbKey),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    wsErrorHandlerPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
