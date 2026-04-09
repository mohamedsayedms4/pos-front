import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react() , tailwindcss()],
  define: {
    // sockjs-client references Node's 'global' — polyfill it for browser builds
    global: 'globalThis',
  },
})
