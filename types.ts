
export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values: () => AsyncIterableIterator<FileSystemHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface FileDocument {
  id: string; // usually the filename for local files
  title: string;
  content: string;
  lastModified: number;
  handle?: FileSystemFileHandle; // The reference to the real file on disk
  isUnsaved?: boolean;
}

export type ViewMode = 'edit' | 'split' | 'preview' | 'hybrid';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';
