import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH lets the same bundle run at the site root (local) or under a sub-path
// such as GitHub Pages (`/table-desk/`). See .github/workflows/pages.yml.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
