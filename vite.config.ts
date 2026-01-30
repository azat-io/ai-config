import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        preserveModulesRoot: 'scripts',
        preserveModules: true,
        exports: 'auto',
      },
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
    },
    lib: {
      entry: path.resolve(import.meta.dirname, 'scripts/index.ts'),
      fileName: (_format, entryName) => `${entryName}.js`,
      name: '@azat-io/ai-config',
      formats: ['es'],
    },
    outDir: path.resolve(import.meta.dirname, 'dist'),
    minify: false,
  },
  plugins: [
    dts({
      include: [
        path.join(import.meta.dirname, 'environment.d.ts'),
        path.join(import.meta.dirname, 'scripts/**/*.ts'),
      ],
      entryRoot: path.resolve(import.meta.dirname, 'scripts'),
      outDir: path.resolve(import.meta.dirname, 'dist'),
    }),
  ],
  root: path.resolve(import.meta.dirname, 'scripts'),
})
