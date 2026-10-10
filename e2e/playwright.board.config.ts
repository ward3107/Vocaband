import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './board', testMatch: '*.spec.ts', timeout: 60000,
  workers: 1, retries: process.env.CI ? 1 : 0, reporter: 'list',
  outputDir: 'test-results/quick-play-board',
  use: { baseURL:'http://localhost:5174', screenshot:'only-on-failure', trace:'retain-on-failure' },
  projects:[
    { name:'Projector 1024', use:{...devices['Desktop Chrome'],viewport:{width:1024,height:768}} },
    { name:'Projector 1920', use:{...devices['Desktop Chrome'],viewport:{width:1920,height:1080}} },
    { name:'Android RTL', use:{...devices['Galaxy S9+']} },
    { name:'WebKit RTL', use:{...devices['iPhone 13']} },
  ],
  webServer:{ command:'PLAYWRIGHT_TEST=true npx vite --host 127.0.0.1 --port 5174 --strictPort',
    cwd:fileURLToPath(new URL('..',import.meta.url)),port:5174,timeout:120000,reuseExistingServer:!process.env.CI },
});
