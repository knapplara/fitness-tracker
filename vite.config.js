import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base: './' = relative Pfade. Dadurch funktioniert die App unter jeder
// GitHub-Pages-Adresse (…github.io/IRGENDEIN-NAME/), ohne dass der
// Repository-Name hier eingetragen werden muss.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
