
const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// --- Logging System Setup ---
// Logs will be saved to: ~/Library/Application Support/RecordNow/app.log (on macOS)
const logFilePath = path.join(app.getPath('userData'), 'app.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Append to log file synchronously to ensure it's written before a crash
  try {
    fs.appendFileSync(logFilePath, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
  
  // Also output to console for development visibility
  console.log(logEntry.trim());
}

// Log app lifecycle events
logToFile('=== Application Started ===');
logToFile(`Log file location: ${logFilePath}`);

// Catch Main Process Errors (Global)
process.on('uncaughtException', (error) => {
  logToFile(`[Main Process Uncaught Exception]: ${error.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
  logToFile(`[Main Process Unhandled Rejection]: ${reason}`);
});

// Handle Renderer Process Errors via IPC
ipcMain.on('log-error', (event, message) => {
  logToFile(message);
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // Mac-style seamless title bar
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for File System Access API in some cases
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js') // Inject preload script
    },
    backgroundColor: '#ffffff'
  });

  // Load the index.html of the app.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // In dev mode, load the Vite server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
  });
};

// Handle File System Access API Permissions
// Electron blocks this by default, we must explicitly allow it.
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'fileSystem') {
      // Allow file system access
      return callback(true);
    }
    // Deny other permissions by default
    return callback(false);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logToFile('=== Application Closing ===');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
