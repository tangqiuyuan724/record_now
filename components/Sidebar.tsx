
import React, { useState, useEffect, useRef } from 'react';
import { FileDocument, Heading } from '../types';
import { FileText, Plus, Trash2, FolderOpen, ChevronDown, Pencil, List, Files } from 'lucide-react';

interface SidebarProps {
  files: FileDocument[];
  folderName: string;
  activeFileId: string | null;
  headings: Heading[];
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onRenameFile: (id: string, newTitle: string) => void;
  onDeleteFile: (id: string, e: React.MouseEvent) => void;
  onOpenFolder: () => void;
  onNavigateHeading: (text: string) => void;
}

type SidebarTab = 'files' | 'outline';

const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  folderName,
  activeFileId, 
  headings,
  onSelectFile, 
  onCreateFile, 
  onRenameFile,
  onDeleteFile,
  onOpenFolder,
  onNavigateHeading
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Switch to outline automatically if user has files and explicitly clicks outline,
  // but if no file is selected, stay on files.
  useEffect(() => {
    if (!activeFileId && activeTab === 'outline') {
        setActiveTab('files');
    }
  }, [activeFileId]);

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
      {/* Title Bar Area with Tabs */}
      <div className="flex flex-col border-b border-mac-divider/50 bg-mac-sidebar z-10">
          <div className="h-12 flex items-center px-4 gap-2">
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
            
            {folderName && activeTab === 'files' && (
                <button 
                onClick={(e) => { e.stopPropagation(); onCreateFile(); }}
                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600 flex-shrink-0"
                title="New File"
                >
                <Plus size={16} />
                </button>
            )}
          </div>

          {/* Tab Switcher */}
          {activeFileId && (
              <div className="flex px-4 pb-2 gap-4 text-xs font-medium text-gray-500">
                  <button 
                    onClick={() => setActiveTab('files')}
                    className={`flex items-center gap-1.5 pb-1 border-b-2 transition-colors ${activeTab === 'files' ? 'text-gray-800 border-blue-500' : 'border-transparent hover:text-gray-600'}`}
                  >
                      <Files size={12} /> Files
                  </button>
                  <button 
                    onClick={() => setActiveTab('outline')}
                    className={`flex items-center gap-1.5 pb-1 border-b-2 transition-colors ${activeTab === 'outline' ? 'text-gray-800 border-blue-500' : 'border-transparent hover:text-gray-600'}`}
                  >
                      <List size={12} /> Outline
                  </button>
              </div>
          )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeTab === 'files' ? (
            /* FILES LIST */
            <>
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
            </>
        ) : (
            /* OUTLINE VIEW */
            <div className="px-2">
                {headings.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-xs px-4">
                        No headings found. Add headings using # to see outline.
                    </div>
                ) : (
                    headings.map((heading, idx) => (
                        <div 
                            key={idx}
                            onClick={() => onNavigateHeading(heading.text)}
                            className="text-xs text-gray-600 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer truncate transition-colors hover:text-blue-600"
                            style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                            title={heading.text}
                        >
                            {heading.text}
                        </div>
                    ))
                )}
            </div>
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
