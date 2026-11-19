import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    retries: 0,
    workers: 1,
    use: {
        baseURL: 'http://localhost:3000/',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        headless: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 3000',
        cwd: './frontend',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
