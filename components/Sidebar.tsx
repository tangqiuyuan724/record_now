import React from 'react';
import { FileDocument } from '../types';
import { FileText, Plus, Trash2, FolderOpen, Folder } from 'lucide-react';

interface SidebarProps {
  files: FileDocument[];
  folderName: string;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string, e: React.MouseEvent) => void;
  onOpenFolder: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  folderName,
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onDeleteFile,
  onOpenFolder
}) => {
  return (
    <div className="w-64 bg-mac-sidebar border-r border-mac-divider flex flex-col h-full select-none">
      {/* Title Bar Area */}
      <div className="h-12 flex items-center px-4 border-b border-mac-divider/50 bg-mac-sidebar z-10">
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {folderName ? (
                <>
                    <Folder size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 truncate" title={folderName}>{folderName}</span>
                </>
            ) : (
                <span className="text-xs font-semibold text-gray-500 tracking-wide">NO FOLDER OPEN</span>
            )}
        </div>
        {folderName && (
            <button 
              onClick={onCreateFile}
              className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600 ml-2"
              title="New File"
            >
              <Plus size={16} />
            </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2">
        {!folderName ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-sm text-gray-400 mb-4">No folder selected</p>
            <button 
                onClick={onOpenFolder}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
                <FolderOpen size={14} /> Open
            </button>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-xs">
            No Markdown files found
          </div>
        ) : (
          files.map(file => (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group px-4 py-1.5 cursor-pointer flex items-center justify-between transition-colors text-sm ${
                activeFileId === file.id 
                  ? 'bg-blue-500/10 text-blue-700' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={14} className={activeFileId === file.id ? 'text-blue-500' : 'text-gray-400'} />
                <span className={`truncate ${activeFileId === file.id ? 'font-medium' : ''}`}>
                  {file.title}
                </span>
              </div>
              
              {/* Optional: Delete button, kept subtle */}
              <button
                onClick={(e) => onDeleteFile(file.id, e)}
                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                  activeFileId === file.id 
                    ? 'hover:bg-blue-200 text-blue-600' 
                    : 'hover:bg-gray-200 text-gray-400'
                }`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Bottom Status / Change Folder */}
      {folderName && (
           <div className="px-4 py-2 border-t border-mac-divider bg-mac-sidebar">
               <button 
                onClick={onOpenFolder}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
               >
                   <FolderOpen size={10} /> Change Folder...
               </button>
           </div>
      )}
    </div>
  );
};

export default Sidebar;