import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const MODEL_FILENAME = 'gemma-4-E4B-it.litertlm';
const MODEL_URL = 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm';

export const getModelPath = () => {
  return `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
};

export const checkModelExists = async (): Promise<boolean> => {
  const path = getModelPath();
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
};

export const deleteModel = async () => {
  const path = getModelPath();
  await FileSystem.deleteAsync(path, { idempotent: true });
};

export const createDownloadResumable = (
  onProgress: (progress: number) => void
) => {
  const path = getModelPath();
  
  return FileSystem.createDownloadResumable(
    MODEL_URL,
    path,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress(progress);
    }
  );
};

export const getModelSize = async (): Promise<string> => {
  const path = getModelPath();
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && !info.isDirectory) {
    const sizeMb = info.size / (1024 * 1024);
    return `${sizeMb.toFixed(1)} Mo`;
  }
  return '0 Mo';
};
