const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { Client, Authenticator } = require('minecraft-launcher-core');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});


// ─── Color palette from the original Revival Launcher ──────────────────────────
// BG_DARK="#1a0a0f" BG_PANEL="#220d14" BG_SIDEBAR="#160810"
// BG_CARD="#2a1018" ACCENT="#F9E5D6" LAUNCH_CLR="#81354E"
// These are referenced in tailwind.config.js via revival-* tokens.

let mainWindow;
let logWindow = null;
// Track running game processes: instanceName -> { process, name }
const runningProcesses = new Map();

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 850,
    minHeight: 580,
    resizable: true,
    backgroundColor: '#111216',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Only use Vite when a dev server URL is explicitly supplied. This keeps
  // `npm run electron` usable after `npm run build` without a server running.
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(error => {
      console.error('Failed to load the Revival Launcher interface:', error);
      dialog.showErrorBox('Revival Launcher could not start', `The interface could not be loaded.\n\n${error.message}`);
    });
  }

  // Renderer errors previously left a blank window with no useful feedback.
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`Renderer failed to load (${code}): ${description} (${url})`);
    dialog.showErrorBox('Revival Launcher could not start', `Could not load the application interface.\n\n${description}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process exited:', details);
    dialog.showErrorBox('Revival Launcher stopped', 'The application interface stopped unexpectedly. Please restart the launcher.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (logWindow) { logWindow.close(); logWindow = null; }
    app.quit();
  });

  checkGitHubUpdates();
}

function checkGitHubUpdates() {
  // electron-updater reads the GitHub owner/repository embedded by electron-builder.
  // It is deliberately disabled for development runs and MSI installs.  The NSIS
  // installer is included with every release because it supports safe in-place updates.
  if (!app.isPackaged || process.platform !== 'win32') return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('update-available', info => {
    sendLog(`[UPDATE] Downloading Revival Launcher ${info.version}...`);
  });
  autoUpdater.on('update-not-available', () => {
    sendLog('[UPDATE] Revival Launcher is up to date.');
  });
  autoUpdater.on('error', error => {
    console.warn('Update check failed:', error.message);
  });
  autoUpdater.on('update-downloaded', info => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update ready',
      message: `Revival Launcher ${info.version} has been downloaded.`,
      detail: 'Restart now to install the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.checkForUpdates().catch(error => {
    console.warn('Unable to check for updates:', error.message);
  });
}

function createLogWindow(instanceName, mcVersion) {
  if (logWindow && !logWindow.isDestroyed()) {
    logWindow.focus();
    // Clear existing logs by reloading
    logWindow.webContents.send('log_clear');
    return;
  }
  logWindow = new BrowserWindow({
    width: 800,
    height: 520,
    minWidth: 600,
    minHeight: 300,
    backgroundColor: '#0d0d0d',
    title: `Revival Logs — ${instanceName} (${mcVersion})`,
    webPreferences: {
      preload: path.join(__dirname, 'log_preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  logWindow.loadFile(path.join(__dirname, 'log_window.html'));
  logWindow.setMenu(null);
  logWindow.on('closed', () => { logWindow = null; });
}

function sendLog(line) {
  const str = String(line);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('launch_log', str);
  if (logWindow && !logWindow.isDestroyed()) logWindow.webContents.send('log_line', str);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Don't quit when only log window closes — only quit from mainWindow.closed
});

ipcMain.handle('window_minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window_maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window_close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

function getAppDataDir() {
  const base = path.join(app.getPath('appData'), 'RevivalLauncher');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

function getInstancesDir() {
  const dir = path.join(getAppDataDir(), 'instances');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMinecraftDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || app.getPath('home'), '.minecraft');
  } else if (process.platform === 'darwin') {
    return path.join(app.getPath('home'), 'Library', 'Application Support', 'minecraft');
  }
  return path.join(app.getPath('home'), '.minecraft');
}

function getAccountsFile() {
  return path.join(getAppDataDir(), 'revival_accounts.json');
}

const DEFAULT_CONFIG = {
  ram_mb: 4096,
  java_path: 'java',
  game_dir: '',
  profile_dir: '',
  last_version: '',
  last_instance: '',
  theme_accent: '#F9E5D6',
  theme_bg: '#1a0a0f',
  theme_grad_end: '#81354E',
  modpack_download_workers: 4,
};

function getConfigFile() {
  return path.join(getAppDataDir(), 'launcher_config.json');
}

function loadConfig() {
  const file = getConfigFile();
  if (fs.existsSync(file)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { ...DEFAULT_CONFIG, ...cfg };
    } catch {}
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  fs.writeFileSync(getConfigFile(), JSON.stringify(cfg, null, 2));
}

ipcMain.handle('load_config', async () => {
  return loadConfig();
});

ipcMain.handle('save_config', async (event, { config }) => {
  saveConfig(config);
  return true;
});

ipcMain.handle('get_minecraft_versions', async () => {
  return new Promise((resolve, reject) => {
    https.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json', { headers: { 'User-Agent': 'RevivalLauncher/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch version manifest: status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.versions || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
});

// ─── Account Management (ported from original launcher.py) ───────────────────

function loadAccounts() {
  const file = getAccountsFile();
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  return { accounts: [], active_id: null };
}

function saveAccounts(data) {
  fs.writeFileSync(getAccountsFile(), JSON.stringify(data, null, 2));
}

ipcMain.handle('list_accounts', async () => {
  return loadAccounts();
});

ipcMain.handle('add_offline_account', async (event, { username }) => {
  const { v4: uuidv4 } = require('crypto');
  const data = loadAccounts();
  const id = require('crypto').randomUUID();
  const account = {
    id,
    type: 'offline',
    username,
    uuid: id.replace(/-/g, ''),
    access_token: '0',
  };
  data.accounts.push(account);
  data.active_id = id;
  saveAccounts(data);
  return account;
});

ipcMain.handle('remove_account', async (event, { id }) => {
  const data = loadAccounts();
  data.accounts = data.accounts.filter(a => a.id !== id);
  if (data.active_id === id) {
    data.active_id = data.accounts[0]?.id || null;
  }
  saveAccounts(data);
  return true;
});

ipcMain.handle('set_active_account', async (event, { id }) => {
  const data = loadAccounts();
  data.active_id = id;
  saveAccounts(data);
  return true;
});

// ─── Microsoft OAuth Device Code Flow (ported from original launcher.py) ─────
// Uses the same Live Connect v1 endpoints as the original launcher

const MS_CLIENT_ID = '00000000402b5328';
const MS_DEVICE_URL = 'https://login.live.com/oauth20_connect.srf';
const MS_TOKEN_URL  = 'https://login.live.com/oauth20_token.srf';
const XBL_URL       = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_URL      = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_AUTH_URL   = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_PROFILE_URL= 'https://api.minecraftservices.com/minecraft/profile';
const MS_SCOPE      = 'service::user.auth.xboxlive.com::MBI_SSL';

async function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const req = require('https').request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Length': bodyBuf.length, ...headers },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    require('https').get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

async function postForm(url, params) {
  const body = new URLSearchParams(params).toString();
  return httpPost(url, body, { 'Content-Type': 'application/x-www-form-urlencoded' });
}

async function postJson(url, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  return httpPost(url, body, {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...extraHeaders,
  });
}

ipcMain.handle('ms_start_device_flow', async () => {
  const res = await postForm(MS_DEVICE_URL, {
    client_id: MS_CLIENT_ID,
    scope: MS_SCOPE,
    response_type: 'device_code',
  });
  if (res.status !== 200) throw new Error(res.body?.error_description || 'Failed to start device flow');
  return res.body; // { device_code, user_code, verification_uri, expires_in, interval }
});

// Poll loop — runs in a detached async task; sends progress to renderer
ipcMain.handle('ms_poll_device_code', async (event, { device_code, interval }) => {
  const deadline = Date.now() + 900_000;
  let iv = Math.max(parseInt(interval || 5), 3) * 1000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, iv));
    const res = await postForm(MS_TOKEN_URL, {
      client_id: MS_CLIENT_ID,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code,
    });
    const body = res.body;
    if (!body || typeof body !== 'object') continue;
    const err = body.error;
    if (err === 'authorization_pending') continue;
    if (err === 'slow_down') { iv += 5000; continue; }
    if (err) throw new Error(body.error_description || `Login failed: ${err}`);
    if (body.access_token) {
      return await completeMsAuth(body);
    }
  }
  throw new Error('Microsoft login timed out.');
});

async function completeMsAuth(msResp, existingId = null) {
  const msAccess  = msResp.access_token;
  const msRefresh = msResp.refresh_token || '';

  // XBL
  const xblRes = await postJson(XBL_URL, {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: msAccess },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  });
  if (xblRes.status !== 200) throw new Error('XBL authentication failed');
  const xblToken = xblRes.body.Token;
  const userHash = xblRes.body.DisplayClaims.xui[0].uhs;

  // XSTS
  const xstsRes = await postJson(XSTS_URL, {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  });
  if (xstsRes.status !== 200) {
    const xerr = xstsRes.body?.XErr;
    if (xerr === 2148916233) throw new Error('This Microsoft account has no Xbox profile.');
    if (xerr === 2148916238) throw new Error('This account does not own Minecraft Java Edition.');
    throw new Error('XSTS authentication failed');
  }
  const xstsToken = xstsRes.body.Token;

  // Minecraft
  const mcRes = await postJson(MC_AUTH_URL, {
    identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
  });
  if (mcRes.status !== 200) throw new Error('Minecraft authentication failed');
  const mcToken = mcRes.body.access_token;

  // Profile
  const profileRes = await httpGet(MC_PROFILE_URL, { Authorization: `Bearer ${mcToken}` });
  if (profileRes.status === 404) throw new Error('This account does not own Minecraft Java Edition.');
  if (profileRes.status !== 200) throw new Error('Failed to fetch Minecraft profile');
  const profile = profileRes.body;

  const id = existingId || require('crypto').randomUUID();
  const account = {
    id,
    type: 'microsoft',
    username: profile.name,
    uuid: profile.id,
    access_token: mcToken,
    refresh_token: msRefresh,
  };

  const data = loadAccounts();
  data.accounts = data.accounts.filter(a => a.id !== id && a.uuid !== profile.id);
  data.accounts.push(account);
  data.active_id = id;
  saveAccounts(data);
  return account;
}

ipcMain.handle('refresh_ms_account', async (event, { account }) => {
  const refresh = account.refresh_token;
  if (!refresh) return account;
  const res = await postForm(MS_TOKEN_URL, {
    client_id: MS_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refresh,
    scope: MS_SCOPE,
  });
  if (!res.body?.access_token) throw new Error('Failed to refresh Microsoft token');
  if (!res.body.refresh_token) res.body.refresh_token = refresh;
  return completeMsAuth(res.body, account.id);
});

// ─── Instance Management ─────────────────────────────────────────────────────

const PROFILE_SUBDIRS = ['mods', 'resourcepacks', 'shaderpacks', 'screenshots', 'saves', 'config'];

function getInstancePath(name) {
  const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_') || 'default';
  const instancePath = path.join(getInstancesDir(), safeName);
  if (!fs.existsSync(instancePath)) fs.mkdirSync(instancePath, { recursive: true });
  for (const sub of PROFILE_SUBDIRS) {
    const subPath = path.join(instancePath, sub);
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
  }
  return instancePath;
}

ipcMain.handle('list_instances', async () => {
  const dir = getInstancesDir();
  const instances = [];
  if (!fs.existsSync(dir)) return instances;
  for (const file of fs.readdirSync(dir)) {
    const p = path.join(dir, file);
    if (!fs.statSync(p).isDirectory()) continue;
    const manifestPath = path.join(p, 'instance.json');
    if (!fs.existsSync(manifestPath)) continue;
    try { instances.push(JSON.parse(fs.readFileSync(manifestPath, 'utf8'))); } catch {}
  }
  return instances;
});

ipcMain.handle('create_instance', async (event, { name, mc_version, loader, loader_version }) => {
  const instancePath = getInstancePath(name);
  const manifest = {
    name, mc_version, loader, loader_version,
    java_path: null,
    jvm_args: '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M',
    min_memory: 2048,
    max_memory: 4096,
    last_played: null,
  };
  fs.writeFileSync(path.join(instancePath, 'instance.json'), JSON.stringify(manifest, null, 2));
  return manifest;
});

ipcMain.handle('update_instance_settings', async (event, { oldName, name, mc_version, loader, loader_version, max_memory, min_memory, java_path }) => {
  const oldSafeName = oldName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_');
  const oldInstancePath = path.join(getInstancesDir(), oldSafeName);
  
  const newSafeName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_');
  const newInstancePath = path.join(getInstancesDir(), newSafeName);
  
  const manifestPath = path.join(oldInstancePath, 'instance.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Instance manifest not found');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name = name;
  manifest.mc_version = mc_version;
  manifest.loader = loader;
  manifest.loader_version = loader_version;
  manifest.max_memory = parseInt(max_memory) || 4096;
  manifest.min_memory = parseInt(min_memory) || 2048;
  manifest.java_path = java_path || null;
  
  if (oldInstancePath !== newInstancePath) {
    if (fs.existsSync(newInstancePath)) throw new Error('An instance with that name already exists');
    fs.renameSync(oldInstancePath, newInstancePath);
  }
  
  const targetManifestPath = path.join(newInstancePath, 'instance.json');
  fs.writeFileSync(targetManifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
});




// ─── Java Detection (ported from original launcher.py) ───────────────────────

ipcMain.handle('detect_java', async () => {
  const paths = [];
  if (process.platform === 'win32') {
    const commonPaths = [
      'C:\\Program Files\\Java',
      'C:\\Program Files (x86)\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
    ];
    for (const base of commonPaths) {
      if (!fs.existsSync(base)) continue;
      try {
        for (const sub of fs.readdirSync(base)) {
          const jexe = path.join(base, sub, 'bin', 'java.exe');
          if (fs.existsSync(jexe)) paths.push(jexe);
        }
      } catch {}
    }
  }
  const pathEnv = process.env.PATH || '';
  for (const part of pathEnv.split(path.delimiter)) {
    const jexe = path.join(part, process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(jexe) && !paths.includes(jexe)) paths.push(jexe);
  }
  return [...new Set(paths)];
});

// ─── Game Launch (ported from original launcher.py build_launch_command) ─────

ipcMain.handle('launch_instance', async (event, { name }) => {
  const instancePath = getInstancePath(name);
  const manifestPath = path.join(instancePath, 'instance.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Instance not found');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  manifest.last_played = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Open the dedicated log window
  createLogWindow(manifest.name, manifest.mc_version);

  // Ensure mods directory exists
  const modsDir = path.join(instancePath, 'mods');
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  // Remove any leftover revival-client-mod jars
  ['revival-client-mod-1.0.0.jar'].forEach(f => {
    const p = path.join(modsDir, f);
    if (fs.existsSync(p)) fs.rmSync(p, { force: true });
  });


  // Account auth — build auth object directly (Mojang auth servers are gone)
  const acctData = loadAccounts();
  const account = acctData.accounts.find(a => a.id === acctData.active_id);

  let auth;
  if (account && account.type === 'microsoft' && account.access_token) {
    // Microsoft account — use stored tokens directly
    auth = {
      access_token: account.access_token,
      client_token: account.uuid,
      uuid: account.uuid,
      name: account.username,
      meta: { type: 'msa', demo: false },
      user_properties: '{}',
    };
  } else {
    // Offline / demo mode — works without any network auth
    const offlineName = account?.username || 'Player';
    const offlineUuid = account?.uuid || '00000000-0000-0000-0000-000000000000';
    auth = {
      access_token: 'offline',
      client_token: offlineUuid,
      uuid: offlineUuid,
      name: offlineName,
      meta: { type: 'legacy', demo: false },
      user_properties: '{}',
    };
  }


  // Build loader-specific options
  const loader = (manifest.loader || '').toLowerCase();
  const loaderVersion = manifest.loader_version || 'latest';

  const opts = {
    clientPackage: null,
    authorization: auth,
    root: getMinecraftDir(),
    version: {
      number: manifest.mc_version,
      type: 'Revival Launcher',
      // fabric/quilt use custom version IDs; let MSMC handle it via custom field
    },
    memory: {
      max: `${manifest.max_memory || 4096}M`,
      min: `${manifest.min_memory || 2048}M`,
    },
    javaPath: manifest.java_path || undefined,
    overrides: {
      gameDirectory: instancePath,
      detached: false,
    },
  };

  // ── Loader installation helpers ──
  function fetchJSON(url) {
    return new Promise((resolve, reject) => {
      const get = (u) => {
        https.get(u, { headers: { 'User-Agent': 'RevivalLauncher/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          let data = '';
          res.on('data', (c) => data += c);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
        }).on('error', reject);
      };
      get(url);
    });
  }

  async function installLoaderProfile(loaderType, mcVersion, requestedVersion) {
    // Meta API URLs
    const META = {
      fabric: 'https://meta.fabricmc.net/v2/versions/loader',
      quilt:  'https://meta.quiltmc.org/v3/versions/loader',
    };
    const metaBase = META[loaderType];
    if (!metaBase) return null; // forge/neoforge handled differently

    sendLog(`[REVIVAL] Installing ${loaderType} loader for ${mcVersion}...`);

    // Resolve 'latest' to actual version
    let resolvedVersion = requestedVersion;
    if (!resolvedVersion || resolvedVersion === 'latest') {
      const versions = await fetchJSON(`${metaBase}/${mcVersion}`);
      if (!versions || versions.length === 0) throw new Error(`No ${loaderType} versions found for MC ${mcVersion}`);
      resolvedVersion = versions[0].loader.version;
      sendLog(`[REVIVAL] Resolved ${loaderType} latest → ${resolvedVersion}`);
    }

    // Build version ID
    const versionId = `${loaderType}-loader-${resolvedVersion}-${mcVersion}`;
    const versionsDir = path.join(getMinecraftDir(), 'versions', versionId);
    const jsonPath = path.join(versionsDir, `${versionId}.json`);

    // Check if already installed
    if (fs.existsSync(jsonPath)) {
      sendLog(`[REVIVAL] ${loaderType} loader already installed: ${versionId}`);
      return versionId;
    }

    // Download profile JSON
    const profileUrl = `${metaBase}/${mcVersion}/${resolvedVersion}/profile/json`;
    sendLog(`[REVIVAL] Fetching profile from ${profileUrl}`);
    const profile = await fetchJSON(profileUrl);

    // Save to versions directory
    fs.mkdirSync(versionsDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2));
    sendLog(`[REVIVAL] Installed ${loaderType} loader: ${versionId}`);
    return versionId;
  }

  // Attach loader
  if (loader === 'fabric' || loader === 'quilt') {
    try {
      const customId = await installLoaderProfile(loader, manifest.mc_version, loaderVersion);
      if (customId) opts.version.custom = customId;
    } catch (err) {
      sendLog(`[REVIVAL ERROR] Failed to install ${loader}: ${err.message}`);
      throw err;
    }
  } else if (loader === 'forge') {
    opts.forge = loaderVersion;
  } else if (loader === 'neoforge') {
    opts.version.custom = `neoforge-${loaderVersion}`;
  }


  const launcher = new Client();

  launcher.on('debug', (e) => sendLog(`[DEBUG] ${e}`));
  launcher.on('data',  (e) => sendLog(String(e)));
  launcher.on('progress', (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('launch_progress', e);
    if (logWindow && !logWindow.isDestroyed()) logWindow.webContents.send('launch_progress', e);
  });
  launcher.on('close', (code) => {
    runningProcesses.delete(name);
    sendLog(`\n--- Minecraft exited with code ${code} ---`);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mc_closed', { name, code });
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('instance_state', { name, running: false });
  });

  const gameProc = await launcher.launch(opts);
  if (gameProc && gameProc.pid) {
    runningProcesses.set(name, { process: gameProc, name });
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('instance_state', { name, running: true, pid: gameProc.pid });
  }

  return `Launching '${manifest.name}' (${manifest.mc_version} ${manifest.loader || 'vanilla'})...`;
});

ipcMain.handle('list_mods', async (event, { name, folder = 'mods' }) => {
  const targetPath = path.join(getInstancePath(name), folder);
  if (!fs.existsSync(targetPath)) return [];
  return fs.readdirSync(targetPath).map(file => ({
    filename: file,
    name: file.endsWith('.disabled') ? file.slice(0, -9) : file,
    enabled: !file.endsWith('.disabled'),
  }));
});

ipcMain.handle('toggle_mod', async (event, { name, filename, folder = 'mods' }) => {
  const targetPath = path.join(getInstancePath(name), folder);
  const oldPath = path.join(targetPath, filename);
  const newFilename = filename.endsWith('.disabled') ? filename.slice(0, -9) : filename + '.disabled';
  const newPath = path.join(targetPath, newFilename);
  fs.renameSync(oldPath, newPath);
  return { filename: newFilename, enabled: !filename.endsWith('.disabled') };
});

ipcMain.handle('delete_mod', async (event, { name, filename, folder = 'mods' }) => {
  const filePath = path.join(getInstancePath(name), folder, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('list_running', async () => {
  return Array.from(runningProcesses.keys());
});

ipcMain.handle('stop_instance', async (event, { name }) => {
  const entry = runningProcesses.get(name);
  if (!entry) return { ok: false, reason: 'not running' };
  try {
    entry.process.kill('SIGTERM');
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

ipcMain.handle('kill_instance', async (event, { name }) => {
  const entry = runningProcesses.get(name);
  if (!entry) return { ok: false, reason: 'not running' };
  try {
    entry.process.kill('SIGKILL');
    runningProcesses.delete(name);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});

ipcMain.handle('open_instance_folder', async (event, { name }) => {
  const instancePath = getInstancePath(name);
  shell.openPath(instancePath);
  return { ok: true };
});

ipcMain.handle('duplicate_instance', async (event, { name }) => {
  const src = getInstancePath(name);
  const newName = name + ' (Copy)';
  const safeName = newName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_') || 'copy';
  const dest = path.join(getInstancesDir(), safeName);
  if (fs.existsSync(dest)) throw new Error('Duplicate already exists');
  
  function copyDir(s, d) {
    fs.mkdirSync(d, { recursive: true });
    for (const f of fs.readdirSync(s)) {
      const sp = path.join(s, f), dp = path.join(d, f);
      if (fs.statSync(sp).isDirectory()) copyDir(sp, dp);
      else fs.copyFileSync(sp, dp);
    }
  }
  copyDir(src, dest);

  // Update manifest name
  const mPath = path.join(dest, 'instance.json');
  if (fs.existsSync(mPath)) {
    const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
    m.name = newName;
    fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
  }
  return { ok: true, name: newName };
});

ipcMain.handle('delete_instance', async (event, { name }) => {
  const instancePath = getInstancePath(name);
  if (fs.existsSync(instancePath)) fs.rmSync(instancePath, { recursive: true, force: true });
  return { ok: true };
});

// Import a .mrpack or .zip of .minecraft folder natively in Node.js
ipcMain.handle('import_pack_native', async (event, { filePath: srcPath, instanceName: rawName }) => {
  const AdmZip = (() => { try { return require('adm-zip'); } catch { return null; } })();
  if (!AdmZip) throw new Error('adm-zip is not installed. Run: npm install adm-zip');

  let finalPath = srcPath;
  const isRemote = srcPath.startsWith('http://') || srcPath.startsWith('https://');
  if (isRemote) {
    const tempDir = app.getPath('temp');
    finalPath = path.join(tempDir, `temp_import_${Date.now()}.zip`);
    sendLog(`[IMPORT] Downloading package from remote URL...`);
    await downloadFile(srcPath, finalPath);
    sendLog(`[IMPORT] Download complete. Extracting...`);
  }

  try {
    const zip = new AdmZip(finalPath);
    const entries = zip.getEntries().map(e => e.entryName);
    const isMrpack = entries.includes('modrinth.index.json');

    if (isMrpack) {
      // Parse modrinth.index.json
      const indexEntry = zip.getEntry('modrinth.index.json');
      const index = JSON.parse(indexEntry.getData().toString('utf8'));
      const packName = rawName || index.name || 'Imported Pack';
      const mcVersion = index.dependencies?.minecraft || '1.20.1';
      const fabricVersion = index.dependencies?.['fabric-loader'];
      const quiltVersion = index.dependencies?.['quilt-loader'];
      const forgeVersion = index.dependencies?.['forge'];
      const loader = fabricVersion ? 'Fabric' : quiltVersion ? 'Quilt' : forgeVersion ? 'Forge' : 'Vanilla';
      const loaderVersion = fabricVersion || quiltVersion || forgeVersion || 'latest';

      const instancePath = getInstancePath(packName);
      const modsDir = path.join(instancePath, 'mods');
      if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

      // Extract override files
      for (const entry of zip.getEntries()) {
        const name = entry.entryName;
        if ((name.startsWith('overrides/') || name.startsWith('client-overrides/')) && !entry.isDirectory) {
          const rel = name.replace(/^(client-)?overrides\//, '');
          const dest = path.join(instancePath, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, entry.getData());
        }
      }

      // Download mods from Modrinth CDN
      const mods = index.files || [];
      let done = 0;
      for (const mod of mods) {
        if (!mod.downloads || !mod.downloads[0]) continue;
        const url = mod.downloads[0];
        const filename = path.basename(mod.path || url);
        const destPath = path.join(instancePath, mod.path || `mods/${filename}`);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        try {
          await downloadFile(url, destPath);
        } catch (e) {
          sendLog(`[IMPORT] Warning: failed to download ${filename}: ${e.message}`);
        }
        done++;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('import_progress', { phase: 'downloading', task: done, total: mods.length, name: filename });
        }
      }

      // Write instance manifest
      const manifest = { name: packName, mc_version: mcVersion, loader, loader_version: loaderVersion, created: new Date().toISOString() };
      fs.writeFileSync(path.join(instancePath, 'instance.json'), JSON.stringify(manifest, null, 2));
      return { ok: true, name: packName, mc_version: mcVersion, loader };

    } else {
      // Treat as .minecraft folder zip — copy everything into a new instance
      const packName = rawName || path.basename(srcPath, path.extname(srcPath));
      const instancePath = getInstancePath(packName);

      // Detect if zip root has a common prefix (e.g. ".minecraft/") and strip it
      let prefix = '';
      if (entries.every(e => e.startsWith(entries[0].split('/')[0] + '/'))) {
        prefix = entries[0].split('/')[0] + '/';
      }

      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        let rel = entry.entryName;
        if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
        if (!rel) continue;
        const dest = path.join(instancePath, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, entry.getData());
      }

      // Write a basic instance manifest if none exists
      const mfPath = path.join(instancePath, 'instance.json');
      if (!fs.existsSync(mfPath)) {
        fs.writeFileSync(mfPath, JSON.stringify({ name: packName, mc_version: 'unknown', loader: 'Vanilla', loader_version: '', created: new Date().toISOString() }, null, 2));
      }
      return { ok: true, name: packName };
    }
  } finally {
    if (isRemote && fs.existsSync(finalPath)) {
      try {
        fs.unlinkSync(finalPath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }
  }
});

// install_mod: finds compatible version from Modrinth then downloads the .jar using Python helper
ipcMain.handle('install_mod', async (event, { name, projectId }) => {
  const instancePath = getInstancePath(name);
  const manifest = JSON.parse(fs.readFileSync(path.join(instancePath, 'instance.json'), 'utf8'));
  const mcVersion = manifest.mc_version;
  const loader = manifest.loader;
  const modsDir = path.join(instancePath, 'mods');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'mod_helpers.py');
    const { exec } = require('child_process');
    const cmd = `python "${pythonScript}" install-mod "${projectId}" "${mcVersion}" "${loader}" "${modsDir}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      try {
        const res = JSON.parse(stdout.trim().split('\n').pop());
        if (res.success) {
          resolve({ title: projectId });
        } else {
          reject(new Error(res.error));
        }
      } catch (err) {
        reject(new Error('Failed to parse response: ' + stdout));
      }
    });
  });
});

// install_mod_file: directly downloads a mod .jar from a given URL into the instance's mods folder
// Handles redirect chains (Modrinth CDN → Cloudflare etc.)
function downloadFile(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error('Too many redirects'));
    const https = require('https');
    const http = require('http');
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    const req = proto.get(url, { headers: { 'User-Agent': 'RevivalLauncher/1.0' } }, (res) => {
      const code = res.statusCode;
      if (code === 301 || code === 302 || code === 307 || code === 308) {
        file.close();
        fs.unlink(destPath, () => {});
        const location = res.headers.location;
        if (!location) return reject(new Error('Redirect with no location header'));
        return resolve(downloadFile(location, destPath, redirectsLeft - 1));
      }
      if (code !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Download failed: HTTP ${code}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve({ ok: true }); });
    });
    req.on('error', (err) => { file.close(); fs.unlink(destPath, () => {}); reject(new Error(`Download error: ${err.message}`)); });
    file.on('error', (err) => { file.close(); fs.unlink(destPath, () => {}); reject(new Error(`File write error: ${err.message}`)); });
  });
}

ipcMain.handle('install_mod_file', async (event, { instanceName, fileUrl, fileName, folder = 'mods' }) => {
  if (!instanceName) throw new Error('No instance selected.');
  if (!fileUrl) throw new Error('No file URL provided.');

  const instancePath = getInstancePath(instanceName);
  const targetDir = path.join(instancePath, folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const safeName = fileName || path.basename(new URL(fileUrl).pathname);
  const destPath = path.join(targetDir, safeName);

  await downloadFile(fileUrl, destPath);
  return { ok: true, path: destPath, fileName: safeName };
});


ipcMain.handle('show_open_dialog', async (event, options) => {
  const { dialog } = require('electron');
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('import_modpack', async (event, { filePath, ramMb, workers }) => {
  const instances = [];
  const dir = getInstancesDir();
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const p = path.join(dir, file);
      if (fs.statSync(p).isDirectory()) {
        const manifestPath = path.join(p, 'instance.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (m.name) instances.push(m.name);
          } catch {}
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'mod_helpers.py');
    const { spawn } = require('child_process');
    const proc = spawn('python', [
      pythonScript,
      'import',
      filePath,
      String(ramMb || 4096),
      String(workers || 4),
      JSON.stringify(instances)
    ]);

    let lastData = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.success) {
            resolve(parsed);
          } else if (parsed.phase) {
            mainWindow.webContents.send('import_progress', parsed);
          }
        } catch (e) {
          lastData = line;
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. ${lastData}`));
      }
    });
  });
});

ipcMain.handle('open_details_window', async (event, { url }) => {
  const detailsWin = new BrowserWindow({
    width: 1024,
    height: 768,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  detailsWin.webContents.session.on('will-download', (dlEvent, item, webContents) => {
    // Intercept the download to save the mod jar file natively
    dlEvent.preventDefault();
    const dlUrl = item.getURL();
    const filename = item.getFilename();

    const cfg = loadConfig();
    const activeInstanceName = cfg.last_instance;
    let targetDir;

    if (activeInstanceName) {
      const safeName = activeInstanceName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/ /g, '_') || 'default';
      targetDir = path.join(getInstancesDir(), safeName, 'mods');
    } else {
      targetDir = path.join(getAppDataDir(), 'mods');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    const fileStream = fs.createWriteStream(targetPath);

    https.get(dlUrl, (response) => {
      // Follow redirect if HTTP 301/302
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirResponse) => {
          redirResponse.pipe(fileStream);
        });
      } else {
        response.pipe(fileStream);
      }

      fileStream.on('finish', () => {
        fileStream.close();
        if (mainWindow) {
          mainWindow.webContents.send('launch_log', `[MOD NATIVE INSTALL] Installed ${filename} natively into '${activeInstanceName || 'Global'}' instance.`);
        }
        const { dialog } = require('electron');
        dialog.showMessageBox(detailsWin, {
          type: 'info',
          title: 'Mod Installed Natively',
          message: `Successfully installed ${filename} natively into your active instance (${activeInstanceName || 'Global'})!`,
          buttons: ['OK']
        });
      });
    }).on('error', (err) => {
      fs.unlink(targetPath, () => {});
      const { dialog } = require('electron');
      dialog.showErrorBox('Installation Failed', `Failed to download ${filename}: ${err.message}`);
    });
  });

  detailsWin.loadURL(url);
  return true;
});

ipcMain.handle('open_url', async (event, { url }) => {
  shell.openExternal(url);
  return true;
});

ipcMain.handle('copy_local_file', async (event, { srcPath, instanceName, folder = 'mods' }) => {
  const filename = path.basename(srcPath);
  const destDir = path.join(getInstancePath(instanceName), folder);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, filename);
  fs.copyFileSync(srcPath, destPath);
  return { ok: true, filename };
});
