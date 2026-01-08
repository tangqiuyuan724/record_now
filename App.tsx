
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import HybridEditor from './components/HybridEditor';
import Preview from './components/Preview';
import { ViewMode } from './types';
import { useFileSystem } from './hooks/useFileSystem';
import { parseHeadings } from './utils/helpers';
import { Layout, Columns, Eye, CheckCircle, Save, PanelLeftClose, PanelLeftOpen, PenTool, Download, FileJson, FileText, FileCode, Printer, FolderOpen } from 'lucide-react';

const App: React.FC = () => {
  // Use Custom Hook for Logic
  const { 
    files, 
    activeFile, 
    activeFileId,
    folderName, 
    saveStatus, 
    openFolder, 
    selectFile, 
    createFile, 
    renameFile,
    updateContent, 
    deleteFile 
  } = useFileSystem();

  const [viewMode, setViewMode] = useState<ViewMode>('hybrid');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false); // New state to control print view
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Derive headings from active file content
  const headings = useMemo(() => {
    return activeFile ? parseHeadings(activeFile.content) : [];
  }, [activeFile?.content]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Printing Lifecycle
  useEffect(() => {
    if (isPrinting) {
      document.body.classList.add('printing');
    } else {
      document.body.classList.remove('printing');
    }

    const afterPrintHandler = () => {
      setIsPrinting(false);
    };

    window.addEventListener('afterprint', afterPrintHandler);
    return () => window.removeEventListener('afterprint', afterPrintHandler);
  }, [isPrinting]);

  const handleExport = async (format: 'pdf' | 'html' | 'md') => {
    setExportMenuOpen(false);
    if (!activeFile) return;

    if (format === 'pdf') {
        // 1. Enter Print Mode (Changes DOM to hide UI and show only preview)
        setIsPrinting(true);
        
        // 2. Wait for DOM update, then print
        setTimeout(() => {
            window.print();
        }, 100);
        return;
    }

    const ext = format === 'html' ? 'html' : 'md';
    let content = activeFile.content;
    let mimeType = 'text/plain';

    if (format === 'html') {
        content = `<!DOCTYPE html><html><head><title>${activeFile.title}</title>
        <style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:20px auto;line-height:1.6;padding:20px;}</style>
        <!-- KaTeX Style -->
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        </head><body>
        <!-- Note: This is raw Markdown export wrapped in HTML. A real HTML export would need SSG rendering. 
             For this scope, we export the markdown source or a basic container. -->
        <pre style="white-space: pre-wrap;">${activeFile.content}</pre>
        </body></html>`;
        mimeType = 'text/html';
    }

    try {
        // @ts-ignore - File System Access API
        if (window.showSaveFilePicker) {
            // @ts-ignore
            const handle = await window.showSaveFilePicker({
                suggestedName: `${activeFile.title}.${ext}`,
                types: [{ accept: { [mimeType]: [`.${ext}`] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(new Blob([content], { type: mimeType }));
            await writable.close();
        } else {
            throw new Error("Fallback needed");
        }
    } catch (e: any) {
        // Fix: Stop execution if user cancelled the save dialog
        if (e.name === 'AbortError') return;

        console.warn("Export fallback triggered:", e);
        // Fallback Download
        const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeFile.title}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }
  };

  /**
   * Navigation Logic for Outline
   * Scans the workspace container for elements containing the header text and scrolls them into view.
   */
  const handleNavigateHeading = (text: string) => {
    if (!workspaceRef.current) return;

    // Helper to find text in standard elements (h1-h6 in preview) or textareas/divs (in editor)
    const findElementByText = (root: HTMLElement, searchText: string): HTMLElement | null => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while (node = walker.nextNode()) {
            if (node.nodeValue?.trim() === searchText.trim()) {
                // Return the parent element of the text node
                return node.parentElement;
            }
        }
        return null;
    };

    const target = findElementByText(workspaceRef.current, text);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional: Flash highlight
        target.classList.add('bg-yellow-100', 'transition-colors', 'duration-500');
        setTimeout(() => target.classList.remove('bg-yellow-100'), 1500);
    }
  };

  return (
    <>
    {/* Main Application Container */}
    <div className={`app-container flex h-screen w-screen bg-mac-bg text-gray-800 overflow-hidden font-sans ${isPrinting ? 'hidden' : ''}`}>
      
      {/* Sidebar - File Explorer & Outline */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 border-r border-mac-divider ${sidebarVisible ? 'w-64' : 'w-0'}`}>
        <Sidebar 
          files={files} 
          folderName={folderName}
          activeFileId={activeFileId} 
          headings={headings}
          onSelectFile={selectFile} 
          onCreateFile={createFile}
          onRenameFile={renameFile}
          onDeleteFile={(id, e) => { e.stopPropagation(); if(confirm('Delete?')) deleteFile(id); }}
          onOpenFolder={openFolder}
          onNavigateHeading={handleNavigateHeading}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Top Toolbar */}
        <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarVisible(!sidebarVisible)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
              {sidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
              {saveStatus === 'saving' ? <><span className="animate-spin"><Save size={12} /></span><span>Saving...</span></> 
              : <><CheckCircle size={12} className="text-green-500" /><span>Saved</span></>}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Export Dropdown */}
             <div className="relative" ref={exportMenuRef}>
                <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className="flex items-center gap-1 text-sm font-medium px-2 py-1.5 rounded-md text-gray-600 hover:bg-gray-100">
                  <Download size={16} /> Export
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                    <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex gap-2"><Printer size={14} /> PDF</button>
                    <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex gap-2"><FileCode size={14} /> HTML</button>
                    <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex gap-2"><FileJson size={14} /> Markdown</button>
                  </div>
                )}
             </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                {[
                    { id: 'hybrid', icon: PenTool, title: 'Editor' },
                    { id: 'edit', icon: Layout, title: 'Source' },
                    { id: 'split', icon: Columns, title: 'Split' },
                    { id: 'preview', icon: Eye, title: 'Preview' }
                ].map(mode => (
                    <button 
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as ViewMode)}
                        className={`p-1.5 rounded-md text-gray-500 transition-all ${viewMode === mode.id ? 'bg-white shadow-sm text-gray-800' : 'hover:text-gray-700'}`}
                        title={mode.title}
                    >
                        <mode.icon size={16} />
                    </button>
                ))}
              </div>
          </div>
        </div>

        {/* Workspace */}
        {activeFile ? (
          <div className="flex-1 flex overflow-hidden relative" ref={workspaceRef}>
             {viewMode === 'hybrid' && (
                <div className="flex-1 overflow-y-auto h-full">
                    <HybridEditor 
                        key={activeFile.id}
                        content={activeFile.content} 
                        onChange={updateContent} 
                    />
                </div>
            )}
            {viewMode === 'edit' && (
                 <textarea
                    value={activeFile.content}
                    onChange={(e) => updateContent(e.target.value)}
                    className="flex-1 w-full h-full p-8 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-700 max-w-4xl mx-auto"
                    placeholder="Type markdown..."
                 />
            )}
            {viewMode === 'split' && (
                <>
                    <textarea value={activeFile.content} onChange={(e) => updateContent(e.target.value)} className="w-1/2 h-full p-8 resize-none focus:outline-none font-mono text-sm border-r border-gray-100" />
                    <div className="w-1/2 h-full overflow-y-auto bg-gray-50/50"><div className="p-8"><Preview content={activeFile.content} /></div></div>
                </>
            )}
             {viewMode === 'preview' && (
                <div className="flex-1 h-full overflow-y-auto bg-white"><div className="p-8 pb-32 max-w-4xl mx-auto"><Preview content={activeFile.content} /></div></div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-300 flex-col gap-4">
             {folderName ? (
                 <>
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center"><PenTool size={32} className="text-blue-300" /></div>
                    <p>Select a markdown file to edit</p>
                    <button onClick={createFile} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">Create New File</button>
                 </>
             ) : (
                 <>
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center"><FolderOpen size={32} className="opacity-20" /></div>
                    <p>Open a folder to start editing</p>
                    <button onClick={openFolder} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">Open Local Folder</button>
                 </>
             )}
          </div>
        )}
      </div>
    </div>

    {/* DEDICATED PRINT VIEW - Using Table Hack for Repeating Margins */}
    <div className={`print-container bg-white w-full h-auto ${isPrinting ? 'block' : 'hidden'}`}>
        {activeFile && (
            <table className="print-table">
                <thead>
                    <tr><td><div className="print-spacer"></div></td></tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="px-[20mm] align-top">
                            <Preview content={activeFile.content} />
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr><td><div className="print-spacer"></div></td></tr>
                </tfoot>
            </table>
        )}
    </div>
    </>
  );
};

export default App;
