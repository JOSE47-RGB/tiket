import {defineConfig} from '@playwright/test';
const url=new URL(process.env.TEST_DATABASE_URL??'invalid:');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test')||!process.env.TEST_UI_PASSWORD)throw Error('Prepara una base local _test y TEST_UI_PASSWORD.');
export default defineConfig({testDir:'./e2e',workers:1,fullyParallel:false,retries:0,use:{baseURL:'http://127.0.0.1:5199',trace:'retain-on-failure'},reporter:'list',webServer:[
 {command:'node ../backend/dist/main.js',url:'http://127.0.0.1:3149/api/health',reuseExistingServer:false,env:{DATABASE_URL:url.href,JWT_SECRET:'Pruebas-locales-exclusivamente-'+process.env.TEST_UI_PASSWORD,HOST:'127.0.0.1',PORT:'3149',COOKIE_SECURE:'false',APP_ORIGIN:'http://127.0.0.1:5199'}},
 {command:'npm run dev -- --port 5199 --strictPort',url:'http://127.0.0.1:5199',reuseExistingServer:false,env:{BACKEND_URL:'http://127.0.0.1:3149'}}
]});
