import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.danaraya.anamnesis',
  appName: 'Anamnesis',
  webDir: 'dist',
  plugins: {
    // SystemBars es el único responsable de los insets nativos (incluido IME).
    SystemBars: { insetsHandling: 'css' },
  },
}

export default config
