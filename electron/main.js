
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// CRITICAL FOR SELF-SIGNED/UNSIGNED APPS
// This allows the app to update without a paid Code Signing Certificate ($400+/yr)
autoUpdater.verifyUpdateCodeSignature = false;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless window for custom UI
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
      height: 30
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      webSecurity: false // Optional: helps with local file loading issues in some cases
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    // Development mode: load localhost
    mainWindow.loadURL(startUrl);
    mainWindow.webContents.openDevTools(); 
  } else {
    // Production mode: load file securely
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Trigger update check once window is loaded
  mainWindow.once('ready-to-show', () => {
    // Check for updates immediately on startup
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
        log.error("Update check failed:", err);
    });
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

/* --- AUTO UPDATER EVENTS --- */
autoUpdater.on('update-available', () => {
  log.info('Update available.');
  if(mainWindow) mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  log.info('Update downloaded.');
  if(mainWindow) mainWindow.webContents.send('update_downloaded');
  
  // Optional: Force install immediately (uncomment if desired)
  // autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
    log.error("AutoUpdater Error: ", err);
});
