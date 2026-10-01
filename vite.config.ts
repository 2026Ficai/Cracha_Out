import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const requiredVariables = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const missingVariables = requiredVariables.filter((name) => !env[name])

  if (missingVariables.length > 0) {
    throw new Error(
      `Variáveis obrigatórias ausentes: ${missingVariables.join(', ')}. ` +
      'Configure-as no Netlify antes de publicar.'
    )
  }

  return {
    plugins: [react()],
  }
})
