
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("\x1b[36m%s\x1b[0m", "=== RecordNow Build Script ===");

const runCommand = (command, stepName, env = process.env) => {
    console.log(`\n\x1b[33m[Step] ${stepName}...\x1b[0m`);
    try {
        execSync(command, { stdio: 'inherit', env });
        console.log(`\x1b[32m[Success] ${stepName} completed.\x1b[0m`);
    } catch (error) {
        console.error(`\x1b[31m[Error] ${stepName} failed.\x1b[0m`);
        process.exit(1);
    }
};

// 1. Install Dependencies
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    runCommand('npm install', 'Installing Dependencies');
} else {
    console.log("\n\x1b[33m[Step] Skipping Install (node_modules exists). Run 'npm install' manually if needed.\x1b[0m");
}

// 2. Build React App
runCommand('npm run build', 'Building React Application');

// 3. Package Electron App
console.log("\n\x1b[33m[Step] Packaging for macOS (DMG/Zip)...\x1b[0m");

// --- CACHE CONFIGURATION ---
// Check for a local 'electron_cache' folder to avoid re-downloading Electron every time
const localCachePath = path.join(__dirname, 'electron_cache');
const buildEnv = { ...process.env };

if (fs.existsSync(localCachePath)) {
    console.log(`\x1b[36m[Info] Detected local cache folder. Using binaries from: ${localCachePath}\x1b[0m`);
    // Tell electron-builder to look here for the zip files
    buildEnv.ELECTRON_CACHE = localCachePath;
} else {
    console.log(`\x1b[36m[Info] No 'electron_cache' folder found. Electron binaries will be downloaded to default cache.\x1b[0m`);
    console.log(`\x1b[90mTip: Create an 'electron_cache' folder in the root and put 'electron-v29.4.6-darwin-x64.zip' inside to speed up builds.\x1b[0m`);
}

try {
    // Determine platform specific flag
    const platformFlag = process.platform === 'darwin' ? '--mac' : '--mac'; 
    
    // Pass the modified environment variables to the command
    execSync(`npx electron-builder ${platformFlag}`, { 
        stdio: 'inherit',
        env: buildEnv 
    });
    
    console.log(`\x1b[32m[Success] Application packaged successfully!\x1b[0m`);
    console.log(`\n\x1b[35m>>> Installer is located in the 'release' folder. <<<\x1b[0m`);
} catch (error) {
    console.error(`\x1b[31m[Error] Packaging failed.\x1b[0m`);
    process.exit(1);
}
