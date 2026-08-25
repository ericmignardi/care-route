/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    // Component files live beside their tests; src/test/ holds only the harness.
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
