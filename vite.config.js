import { defineConfig } from "vite";
import reactPlugin from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactPlugin()],
  base: '/cad-os/', 
  build: {
    outDir: "build",
  },
  server: {
    port: 4444,
  },
  worker: {
    format: 'es', // Explicitly set worker format to ES module
  },
});
