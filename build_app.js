
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("\x1b[36m%s\x1b[0m", "=== RecordNow Build Script ===");

const runCommand = (command, stepName) => {
    console.log(`\n\x1b[33m[Step] ${stepName}...\x1b[0m`);
    try {
        execSync(command, { stdio: 'inherit' });
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
console.log("This may take a few minutes...");

try {
    // Determine platform specific flag
    const platformFlag = process.platform === 'darwin' ? '--mac' : '--mac'; // Force mac config but run anywhere possible
    execSync(`npx electron-builder ${platformFlag}`, { stdio: 'inherit' });
    console.log(`\x1b[32m[Success] Application packaged successfully!\x1b[0m`);
    console.log(`\n\x1b[35m>>> Installer is located in the 'release' folder. <<<\x1b[0m`);
} catch (error) {
    console.error(`\x1b[31m[Error] Packaging failed.\x1b[0m`);
    process.exit(1);
}
