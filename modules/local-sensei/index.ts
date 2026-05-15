import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';

// Lazy-load the native module
let _module: any = null;
function getModule() {
  if (_module) return _module;
  try {
    _module = requireNativeModule('LocalSensei');
    return _module;
  } catch (e) {
    console.error("LocalSensei native module not found. Please rebuild the app.", e);
    return null;
  }
}

const emitter = new EventEmitter(getModule());

export function addTokenListener(listener: (event: { text: string, isDone: boolean }) => void): Subscription {
  return emitter.addListener('onTokenReceived', listener);
}

export async function isModelPresent(modelPath: string): Promise<boolean> {
  const m = getModule();
  if (!m) return false;
  const cleanPath = modelPath.replace('file://', '');
  return await m.isModelPresent(cleanPath);
}

export async function initializeEngine(modelPath: string): Promise<string> {
  const m = getModule();
  if (!m) return "Error: Native module not loaded";
  const cleanPath = modelPath.replace('file://', '');
  return await m.initializeEngine(cleanPath);
}

export async function sendMessage(text: string): Promise<string> {
  const m = getModule();
  if (!m) return "Error: Native module not loaded";
  return await m.sendMessage(text);
}

export function closeEngine(): void {
  const m = getModule();
  m?.close();
}
