import { invoke as tauriInvoke } from '@tauri-apps/api/tauri';

export const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI_IPC__ !== undefined;
};

export const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
};

// Simulated mock database for browser-only mode
const MOCK_STORAGE_KEY = 'revival_mock_instances';
const getMockInstances = () => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    const initial = [
      { name: 'Vanilla 1.20.4', mc_version: '1.20.4', loader: 'Vanilla', loader_version: '1.20.4', last_played: '2 hours ago' },
      { name: 'Fabulously Optimized', mc_version: '1.20.1', loader: 'Fabric', loader_version: '0.15.3', last_played: 'Yesterday' },
      { name: 'All the Mods 9', mc_version: '1.20.1', loader: 'Forge', loader_version: '47.2.0', last_played: '3 days ago' },
    ];
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const saveMockInstance = (instance: any) => {
  const list = getMockInstances();
  list.push(instance);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(list));
};

export async function safeInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  // 1. Electron wrapper
  if (isElectron()) {
    return await (window as any).electronAPI.invoke(cmd, args);
  }

  // 2. Tauri wrapper
  if (isTauri()) {
    try {
      return await tauriInvoke<T>(cmd, args);
    } catch (err) {
      console.error(`Tauri invoke error for ${cmd}:`, err);
      throw err;
    }
  }

  // 3. Mock fallback for browser preview
  console.warn(`Native bridge not available. Mocking command: ${cmd}`, args);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (cmd === 'list_instances') {
        resolve(getMockInstances() as unknown as T);
      } else if (cmd === 'create_instance') {
        const newInst = {
          name: args?.name || 'Unnamed',
          mc_version: args?.mc_version || '1.20.4',
          loader: args?.loader || 'Vanilla',
          loader_version: args?.loader_version || 'latest',
          last_played: null
        };
        saveMockInstance(newInst);
        resolve(newInst as unknown as T);
      } else if (cmd === 'detect_java') {
        resolve(['/usr/bin/java', '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java', 'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe'] as unknown as T);
      } else if (cmd === 'launch_instance') {
        resolve(`Launched ${args?.name} mock successful!` as unknown as T);
      } else {
        resolve(null as unknown as T);
      }
    }, 300);
  });
}
