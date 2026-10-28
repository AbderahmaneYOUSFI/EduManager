import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
const base = new URL(process.env.DATABASE_URL);
const name = `edumanager_test_${Date.now()}`;
const connection = new pg.Client({connectionString:base.toString()});
await connection.connect();
await connection.query(`CREATE DATABASE "${name}"`);
const testUrl = new URL(base); testUrl.pathname = `/${name}`;
const env = {...process.env,DATABASE_URL:testUrl.toString(),TEST_DATABASE:'true',SEED_DEMO:'false',NEXTAUTH_URL:'http://localhost:3100'};
function run(file,args=[]) { const result=spawnSync(process.execPath,[file,...args],{env,stdio:'inherit'}); if(result.status!==0) throw new Error(`Check failed: ${file}`); }
try {
  run('node_modules/prisma/build/index.js',['migrate','deploy']);
  if(process.argv.includes('--e2e')) {
    run('node_modules/tsx/dist/cli.mjs',['prisma/seed.ts']);
    run('node_modules/@playwright/test/cli.js',['test']);
  } else run('node_modules/vitest/vitest.mjs',['run','--config','vitest.integration.config.ts']);
} catch(error) { console.error(error.message);process.exitCode=1; }
finally { await connection.query(`DROP DATABASE "${name}" WITH (FORCE)`);await connection.end(); }
