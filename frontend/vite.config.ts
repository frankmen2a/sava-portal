import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Equivalent to --host
    allowedHosts: [
      "5173-ipzalvm88zemxfxr4af3k-b9da8ea4.manus.computer",
      "5174-i1107vu87wiwzq4jp5x62-b9da8ea4.manus.computer"
    ]
  }
})

