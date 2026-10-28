import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir:'tests/e2e', timeout:120000, expect:{timeout:20000}, fullyParallel:false, workers:1, use:{baseURL:'http://localhost:3100',trace:'retain-on-failure'}, projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}], webServer:{command:'npm run dev -- --port 3100',url:'http://localhost:3100',reuseExistingServer:false,timeout:120000,env:{NEXTAUTH_URL:'http://localhost:3100'}} });
