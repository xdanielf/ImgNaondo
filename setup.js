const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const PROJECT_NAME = 'imgnaondo';
const R2_BUCKET_NAME = 'imgnaondo';
const D1_DB_NAME = 'imgnaondo-db';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question, defaultVal) {
  return new Promise((resolve) => {
    rl.question(`${question} ${defaultVal ? `[${defaultVal}] ` : ''}`, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function run(command) {
  try {
    console.log(`\x1b[36m> ${command}\x1b[0m`);
    // Use npx explicitly, and handle windows cmd
    return execSync(command, { stdio: 'pipe', encoding: 'utf-8', shell: true });
  } catch (error) {
    // Return the error output if command fails, so we can handle it
    if (error.stderr) return error.stderr.toString();
    if (error.stdout) return error.stdout.toString();
    throw error;
  }
}

function runInherit(command) {
  try {
    console.log(`\x1b[36m> ${command}\x1b[0m`);
    execSync(command, { stdio: 'inherit', shell: true });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\x1b[32m=== ImgNaondo Auto Setup ===\x1b[0m');
  console.log('This script will help you set up Cloudflare R2, D1, and deploy the worker.\n');

  // 1. Check Login
  try {
    run('npx wrangler whoami');
  } catch (e) {
    console.log('\x1b[33m! You seem to be not logged in to Wrangler.\x1b[0m');
    console.log('Please log in in the browser window that opens...');
    runInherit('npx wrangler login');
  }

  // 2. Setup R2 Bucket
  console.log('\n\x1b[33m--- Setting up R2 Bucket ---\x1b[0m');
  const r2Out = run(`npx wrangler r2 bucket create ${R2_BUCKET_NAME}`);
  if (r2Out.includes('already exists')) {
    console.log(`Bucket '${R2_BUCKET_NAME}' already exists.`);
  } else {
    console.log(`Bucket '${R2_BUCKET_NAME}' created.`);
  }

  // 3. Setup D1 Database
  console.log('\n\x1b[33m--- Setting up D1 Database ---\x1b[0m');
  let dbId = '';
  
  // Check if already exists in config or list
  const d1List = run('npx wrangler d1 list --json');
  const d1ListObj = JSON.parse(d1List);
  const existingDb = d1ListObj.find(db => db.name === D1_DB_NAME);

  if (existingDb) {
    console.log(`Database '${D1_DB_NAME}' already exists (ID: ${existingDb.uuid}).`);
    dbId = existingDb.uuid;
  } else {
    console.log(`Creating database '${D1_DB_NAME}'...`);
    const d1CreateOut = run(`npx wrangler d1 create ${D1_DB_NAME}`);
    // Extract ID using regex - handle both plain text and JSON representation in output
    // Looking for "database_id": "..." or database_id = "..."
    const match = d1CreateOut.match(/"?database_id"?\s*[:=]\s*"?([a-f0-9-]+)"?/);
    if (match && match[1]) {
      dbId = match[1];
      console.log(`Database created (ID: ${dbId}).`);
    } else {
      console.error('Failed to extract Database ID. Output:', d1CreateOut);
      console.log('Please enter the Database ID manually (check Cloudflare dashboard):');
      dbId = await ask('Database ID:');
    }
  }

  // 4. Create wrangler.toml
  console.log('\n\x1b[33m--- Generating wrangler.toml ---\x1b[0m');
  const password = await ask('Set an access password for your image host:', 'password123');
  
  const tomlContent = `name = "${PROJECT_NAME}"
main = "worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "${R2_BUCKET_NAME}"

[[d1_databases]]
binding = "DB"
database_name = "${D1_DB_NAME}"
database_id = "${dbId}"

[vars]
PASSWORD = "${password}"
`;

  fs.writeFileSync('wrangler.toml', tomlContent);
  console.log('wrangler.toml created successfully.');

  // 5. Initialize Schema
  console.log('\n\x1b[33m--- Initializing Database Schema ---\x1b[0m');
  // Need to wait a bit sometimes for propagation, but usually instant
  runInherit(`npx wrangler d1 execute ${D1_DB_NAME} --file=schema.sql --remote`);
  
  // 6. Deploy
  console.log('\n\x1b[33m--- Deploying Worker ---\x1b[0m');
  const success = runInherit('npx wrangler deploy');

  if (success) {
    console.log('\n\x1b[32m=== Deployment Complete! ===\x1b[0m');
    console.log('1. Your image host is live.');
    console.log('2. Access Password: ${password}');
    console.log('3. If you have existing images in R2, log in and click the "Sync" button.');
  } else {
    console.log('\n\x1b[31m=== Deployment Failed ===\x1b[0m');
    console.log('Please check the logs above.');
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
