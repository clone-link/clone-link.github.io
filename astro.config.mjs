import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://clone-link.github.io',
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'pt', 'de', 'fr', 'ja', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
