
import React, { useState, useEffect, useRef } from 'react';
import { FileDocument } from '../types';
import { FileText, Plus, Trash2, FolderOpen, ChevronDown, Pencil } from 'lucide-react';

interface SidebarProps {
  files: FileDocument[];
  folderName: string;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onRenameFile: (id: string, newTitle: string) => void;
  onDeleteFile: (id: string, e: React.MouseEvent) => void;
  onOpenFolder: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  folderName,
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onRenameFile,
  onDeleteFile,
  onOpenFolder
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [editingId]);

  const startRenaming = (file: FileDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditValue(file.title);
  };

  const handleRenameSubmit = () => {
    if (editingId && editValue.trim()) {
        onRenameFile(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleRenameSubmit();
    } else if (e.key === 'Escape') {
        setEditingId(null);
    }
  };

  return (
    <div className="w-64 bg-mac-sidebar border-r border-mac-divider flex flex-col h-full select-none">
      {/* Title Bar Area */}
      <div className="h-12 flex items-center px-4 border-b border-mac-divider/50 bg-mac-sidebar z-10 gap-2">
        <div 
            onClick={onOpenFolder}
            className="flex-1 flex items-center gap-2 overflow-hidden cursor-pointer hover:bg-black/5 py-1 px-1.5 -ml-1.5 rounded-md transition-colors group"
            title="Click to switch folder"
        >
            {folderName ? (
                <>
                    <FolderOpen size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 truncate">{folderName}</span>
                    <ChevronDown size={12} className="text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
            ) : (
                <>
                    <span className="text-xs font-semibold text-gray-500 tracking-wide">NO FOLDER</span>
                    <ChevronDown size={12} className="text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
            )}
        </div>
        
        {folderName && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCreateFile(); }}
              className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600 flex-shrink-0"
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
                <FolderOpen size={14} /> Open Folder
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
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <FileText size={14} className={`flex-shrink-0 ${activeFileId === file.id ? 'text-blue-500' : 'text-gray-400'}`} />
                
                {editingId === file.id ? (
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white border border-blue-400 rounded px-1 py-0.5 text-xs w-full focus:outline-none text-gray-800"
                    />
                ) : (
                    <span 
                        className={`truncate ${activeFileId === file.id ? 'font-medium' : ''}`}
                        onDoubleClick={(e) => startRenaming(file, e)}
                        title={file.id}
                    >
                      {file.title}
                    </span>
                )}
              </div>
              
              {/* Group Actions */}
              {editingId !== file.id && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRenaming(file, e)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => onDeleteFile(file.id, e)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                  </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Bottom Status / Change Folder */}
      {folderName && (
           <div className="px-4 py-2 border-t border-mac-divider bg-mac-sidebar">
               <button 
                onClick={onOpenFolder}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors w-full"
               >
                   <FolderOpen size={10} /> Switch Folder...
               </button>
           </div>
      )}
    </div>
  );
};

export default Sidebar;
