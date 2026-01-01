
import { FileDocument } from '../types';

const STORAGE_KEY = 'recordnow_files';

/**
 * Loads files from browser LocalStorage.
 * Used as a fallback when the File System Access API is unavailable.
 */
export const loadFiles = (): FileDocument[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load files from LocalStorage", e);
    return [];
  }
};

/**
 * Saves the entire file list to LocalStorage.
 */
export const saveFiles = (files: FileDocument[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error("Failed to save files to LocalStorage", e);
  }
};
