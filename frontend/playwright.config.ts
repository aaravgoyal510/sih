import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:180000,expect:{timeout:90000},workers:1,use:{baseURL:process.env.TEST_FRONTEND_URL||'http://localhost:3000',headless:true,viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list']]});
