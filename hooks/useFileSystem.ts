
import { useState, useRef, useEffect, useCallback } from 'react';
import { FileDocument, FileSystemDirectoryHandle, FileSystemFileHandle, SaveStatus } from '../types';
import { loadFiles, saveFiles } from '../utils/storage';
import { generateId } from '../utils/helpers';

const AUTO_SAVE_DELAY = 2000;

export const useFileSystem = () => {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string>('');

  // Refs needed to access latest state inside async timeouts/callbacks
  const filesRef = useRef(files);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { filesRef.current = files; }, [files]);

  /**
   * Scans a directory handle for .md files and populates the file list.
   */
  const scanDirectory = async (dirHandle: FileSystemDirectoryHandle) => {
    const newFiles: FileDocument[] = [];
    // @ts-ignore - TS definition for AsyncIterableIterator on FileSystemDirectoryHandle
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        newFiles.push({
          id: entry.name,
          title: entry.name.replace('.md', ''),
          content: '', // Content loaded on demand
          lastModified: Date.now(),
          handle: entry as FileSystemFileHandle,
          isUnsaved: false
        });
      }
    }
    newFiles.sort((a, b) => a.title.localeCompare(b.title));
    setFiles(newFiles);
  };

  /**
   * Opens the native directory picker. Falls back to LocalStorage on error.
   */
  const openFolder = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      setRootDirHandle(dirHandle);
      setFolderName(dirHandle.name);
      await scanDirectory(dirHandle);
      setActiveFileId(null);
    } catch (err: any) {
      // If user cancels the picker, do nothing (keep current state)
      if (err.name === 'AbortError') return;

      console.warn('File System Access API failed, using Local Storage.', err);
      // Only fallback to local storage if we really need to (e.g. serious error, or explicit choice elsewhere)
      // For now, if it fails, we assume fallback is acceptable or we are already in fallback mode.
      // But let's check if we already have a folder open.
      if (!rootDirHandle && !folderName) {
         useLocalStorageFallback();
      }
    }
  };

  const useLocalStorageFallback = () => {
    setRootDirHandle(null);
    setFolderName("Local Storage");
    const saved = loadFiles();
    setFiles(saved.map(f => ({ ...f, handle: undefined, isUnsaved: false })));
    setActiveFileId(null);
  };

  /**
   * Loads file content from disk if not already loaded.
   */
  const selectFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    if (!file.content && file.handle) {
      try {
        const fileData = await file.handle.getFile();
        const text = await fileData.text();
        setFiles(prev => prev.map(f => f.id === id ? { ...f, content: text } : f));
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }
    setActiveFileId(id);
  };

  /**
   * Creates a new file (Native or LocalStorage).
   */
  const createFile = async () => {
    // If no mode selected, prompt user
    if (!rootDirHandle && folderName !== "Local Storage") {
        if (confirm("Start in Local Storage (Demo Mode)?")) {
            useLocalStorageFallback();
        } else {
            return;
        }
    }

    const filename = `Untitled ${files.length + 1}.md`;

    if (rootDirHandle) {
      try {
        const newHandle = await rootDirHandle.getFileHandle(filename, { create: true });
        const newFile: FileDocument = {
          id: filename,
          title: filename.replace('.md', ''),
          content: '',
          lastModified: Date.now(),
          handle: newHandle,
          isUnsaved: false
        };
        setFiles(prev => [newFile, ...prev]);
        setActiveFileId(filename);
      } catch (e) { console.error(e); }
    } else {
      // Local Storage
      const newFile: FileDocument = {
        id: generateId(),
        title: `Untitled ${files.length + 1}`,
        content: '',
        lastModified: Date.now(),
        isUnsaved: false
      };
      const updated = [newFile, ...files];
      setFiles(updated);
      saveFiles(updated);
      setActiveFileId(newFile.id);
    }
  };

  /**
   * Renames a file.
   * For Native FS: Creates new file -> Copies content -> Deletes old file.
   */
  const renameFile = async (id: string, newTitle: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    // Clean title and ensure uniqueness logic could go here, 
    // but we assume UI passes a valid string. 
    // We do need to prevent overwriting existing files silently if possible.
    
    if (rootDirHandle && file.handle) {
      const newFilename = newTitle.endsWith('.md') ? newTitle : `${newTitle}.md`;
      if (files.some(f => f.id === newFilename && f.id !== id)) {
        alert("A file with this name already exists.");
        return;
      }

      try {
        // 1. Create new file handle
        const newHandle = await rootDirHandle.getFileHandle(newFilename, { create: true });
        
        // 2. Ensure content is loaded
        let contentToMove = file.content;
        if (!contentToMove) {
             const fileData = await file.handle.getFile();
             contentToMove = await fileData.text();
        }

        // 3. Write to new file
        const writable = await newHandle.createWritable();
        await writable.write(contentToMove);
        await writable.close();

        // 4. Delete old file
        await rootDirHandle.removeEntry(file.id);

        // 5. Update State
        setFiles(prev => prev.map(f => f.id === id ? { 
            ...f, 
            id: newFilename, 
            title: newFilename.replace('.md', ''), 
            handle: newHandle 
        } : f));

        if (activeFileId === id) setActiveFileId(newFilename);

      } catch (e) {
        console.error("Rename failed on File System:", e);
        alert("Failed to rename file. Check permissions.");
      }
    } else {
      // Local Storage Rename
      // For local storage, 'id' is distinct from title usually, but let's keep them synced if ID was a filename logic,
      // OR just update the title property. In the createFile logic above for LS, ID is random.
      // However, the interface asks for 'rename', so we update the title.
      
      const updated = files.map(f => f.id === id ? { ...f, title: newTitle } : f);
      setFiles(updated);
      saveFiles(updated);
    }
  };

  /**
   * Actual write operation to disk or local storage.
   */
  const persistFile = async (fileId: string, content: string) => {
    const currentFiles = filesRef.current;
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

    if (file.handle) {
      try {
        const writable = await file.handle.createWritable();
        await writable.write(content);
        await writable.close();
        setSaveStatus('saved');
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus('unsaved');
      }
    } else {
      const updated = currentFiles.map(f => f.id === fileId ? { ...f, content, lastModified: Date.now() } : f);
      saveFiles(updated);
      setSaveStatus('saved');
    }
  };

  /**
   * Update content in state and schedule auto-save.
   */
  const updateContent = (content: string) => {
    if (!activeFileId) return;

    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content, isUnsaved: true } : f));
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    const targetId = activeFileId;
    autoSaveTimerRef.current = setTimeout(() => {
      persistFile(targetId, content);
    }, AUTO_SAVE_DELAY);
  };

  const deleteFile = (id: string) => {
    // Confirmation is handled in UI
    const file = files.find(f => f.id === id);
    
    const doDelete = async () => {
        if (rootDirHandle && file?.handle) {
            try {
                await rootDirHandle.removeEntry(id);
            } catch(e) {
                console.error("Failed to delete from disk", e);
                return;
            }
        }
        
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        if (!rootDirHandle) saveFiles(newFiles);
        if (activeFileId === id) setActiveFileId(null);
    };
    
    doDelete();
  };

  return {
    files,
    activeFile: files.find(f => f.id === activeFileId),
    activeFileId,
    folderName,
    saveStatus,
    openFolder,
    selectFile,
    createFile,
    renameFile,
    updateContent,
    deleteFile,
    useLocalStorageFallback
  };
};
