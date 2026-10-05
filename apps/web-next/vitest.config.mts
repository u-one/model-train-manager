import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['tests/**', 'node_modules/**'],
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/test/**',
                'src/**/*.d.ts',
                'src/app/**/page.tsx',
                'src/app/**/layout.tsx',
            ],
        },
    },
})
