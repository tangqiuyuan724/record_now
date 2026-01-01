
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MermaidDiagram from './MermaidDiagram';
import TableEditor from './TableEditor';
import { generateId, convertFileToBase64, isTableLine } from '../utils/helpers';

interface HybridEditorProps {
  content: string;
  onChange: (content: string) => void;
}

interface Block {
  id: string;
  content: string;
  type: 'text' | 'table';
}

/**
 * HybridEditor: Provides a Notion-like block experience but saves as pure Markdown.
 * It parses Markdown into blocks (lines or tables), renders them individually,
 * and reconstructs the Markdown string on change.
 */
const HybridEditor: React.FC<HybridEditorProps> = ({ content, onChange }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const initialized = useRef(false);

  // Parse Initial Content into Blocks
  useEffect(() => {
    if (!initialized.current) {
        if (content) {
            const lines = content.split('\n');
            const newBlocks: Block[] = [];
            let currentTableBuffer: string[] = [];

            lines.forEach(line => {
                if (isTableLine(line)) {
                    currentTableBuffer.push(line);
                } else {
                    // Flush table buffer if we hit a non-table line
                    if (currentTableBuffer.length > 0) {
                        newBlocks.push({ id: generateId(), content: currentTableBuffer.join('\n'), type: 'table' });
                        currentTableBuffer = [];
                    }
                    newBlocks.push({ id: generateId(), content: line, type: 'text' });
                }
            });
            // Flush remaining table buffer
            if (currentTableBuffer.length > 0) {
                newBlocks.push({ id: generateId(), content: currentTableBuffer.join('\n'), type: 'table' });
            }
            setBlocks(newBlocks);
        } else {
            setBlocks([{ id: generateId(), content: '', type: 'text' }]);
        }
        initialized.current = true;
    }
  }, []); // Run once on mount

  // Helper: Reconstruct Markdown and notify parent
  const updateParent = (newBlocks: Block[]) => {
    const newContent = newBlocks.map(b => b.content).join('\n');
    onChange(newContent);
  };

  const updateBlockContent = (id: string, newContent: string) => {
    setBlocks(prev => {
      const newBlocks = prev.map(b => b.id === id ? { ...b, content: newContent } : b);
      updateParent(newBlocks);
      return newBlocks;
    });
  };

  // --- Event Handlers ---

  const handleKeyDown = (e: React.KeyboardEvent, index: number, id: string) => {
    // ENTER: Create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const currentBlock = blocks[index];
      
      // Auto-Table Creation: Check if user typed valid table syntax like `| a | b |`
      if (currentBlock.type === 'text' && currentBlock.content.trim().startsWith('|') && (currentBlock.content.match(/\|/g) || []).length >= 2) {
          const headers = currentBlock.content.trim().split('|').filter(s => s).map(s => s.trim());
          if (headers.length > 0) {
              const delimiterRow = headers.map(() => '---').join(' | ');
              const firstRow = headers.map(() => ' ').join(' | ');
              const tableMd = `| ${headers.join(' | ')} |\n| ${delimiterRow} |\n| ${firstRow} |`;
              
              setBlocks(prev => {
                  const newBlocks = [...prev];
                  newBlocks[index] = { ...currentBlock, content: tableMd, type: 'table' }; // Convert current
                  const nextBlock = { id: generateId(), content: '', type: 'text' } as Block; // Add empty next
                  newBlocks.splice(index + 1, 0, nextBlock);
                  updateParent(newBlocks);
                  return newBlocks;
              });
              return; 
          }
      }

      // Default: Split block or create new line
      setBlocks(prev => {
        const newBlock: Block = { id: generateId(), content: '', type: 'text' };
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        updateParent(newBlocks);
        setFocusedBlockId(newBlock.id);
        return newBlocks;
      });
    } 
    // BACKSPACE: Delete empty block
    else if (e.key === 'Backspace' && blocks[index].content === '') {
      if (index > 0) {
        e.preventDefault();
        setBlocks(prev => {
            const newBlocks = prev.filter(b => b.id !== id);
            updateParent(newBlocks);
            setFocusedBlockId(prev[index - 1].id);
            return newBlocks;
        });
      }
    } 
    // NAVIGATION: Arrows
    else if (e.key === 'ArrowUp' && index > 0) setFocusedBlockId(blocks[index - 1].id);
    else if (e.key === 'ArrowDown' && index < blocks.length - 1) setFocusedBlockId(blocks[index + 1].id);
  };

  const handleContainerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]?.type.startsWith('image/')) {
        try {
            const base64 = await convertFileToBase64(e.dataTransfer.files[0]);
            const newBlock: Block = { id: generateId(), content: `![Image](${base64})`, type: 'text' };
            setBlocks(prev => {
                const newBlocks = [...prev, newBlock];
                updateParent(newBlocks);
                return newBlocks;
            });
            setFocusedBlockId(newBlock.id);
        } catch (err) { console.error(err); }
    }
  };

  return (
    <div 
        className={`w-full max-w-4xl mx-auto p-8 pb-32 min-h-full transition-all ${isDragging ? 'bg-blue-50/50 ring-2 ring-blue-500/20 rounded-xl' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleContainerDrop}
    >
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
            {block.type === 'table' ? (
                // --- Table Block ---
                <div onClick={() => setFocusedBlockId(block.id)} className={`transition-all ${focusedBlockId === block.id ? 'ring-2 ring-blue-500/10 rounded-xl bg-blue-50/10' : ''}`}>
                    {focusedBlockId === block.id ? (
                        <TableEditor content={block.content} onChange={(val) => updateBlockContent(block.id, val)} />
                    ) : (
                         <div className="prose prose-slate max-w-none my-6 cursor-pointer hover:bg-gray-50 rounded-lg p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                         </div>
                    )}
                </div>
            ) : (
                // --- Text Block ---
                <EditorBlock
                    content={block.content}
                    isFocused={focusedBlockId === block.id}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onChange={(val) => updateBlockContent(block.id, val)}
                    onKeyDown={(e) => handleKeyDown(e, index, block.id)}
                />
            )}
        </React.Fragment>
      ))}
      
      {/* Empty space click handler to focus last block */}
      <div className="flex-1 min-h-[200px] cursor-text" onClick={() => {
            if (blocks.length > 0) setFocusedBlockId(blocks[blocks.length - 1].id);
            else {
                const newBlock: Block = { id: generateId(), content: '', type: 'text' };
                setBlocks([newBlock]);
                setFocusedBlockId(newBlock.id);
                updateParent([newBlock]);
            }
      }} />
    </div>
  );
};

// --- Sub-Component: Text Block ---

interface EditorBlockProps {
    content: string;
    isFocused: boolean;
    onFocus: () => void;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

const EditorBlock: React.FC<EditorBlockProps> = ({ content, isFocused, onFocus, onChange, onKeyDown }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isFocused && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            textareaRef.current.focus();
        }
    }, [isFocused, content]);

    // Simple markdown syntax highlighter for the textarea input
    const getInputStyle = (text: string) => {
        if (text.startsWith('# ')) return 'text-3xl font-bold pb-2 mt-4';
        if (text.startsWith('## ')) return 'text-2xl font-bold pb-2 mt-3';
        if (text.startsWith('### ')) return 'text-xl font-bold pb-2 mt-2';
        if (text.startsWith('> ')) return 'italic text-gray-500 border-l-4 border-gray-300 pl-4 py-1';
        if (text.startsWith('```')) return 'font-mono text-sm bg-gray-50 p-3 rounded-lg text-gray-600 border border-gray-100';
        return 'text-base leading-relaxed'; 
    };

    return (
        <div className="min-h-[1.5em] mb-1 relative group">
            {isFocused ? (
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none placeholder-gray-300 ${getInputStyle(content)}`}
                    placeholder="Type '/' for commands"
                    rows={1}
                />
            ) : (
                <div onClick={onFocus} className="cursor-text hover:bg-gray-50/50 rounded -mx-2 px-2 transition-colors min-h-[24px]">
                    {content.trim() === '' ? <br /> : (
                        <div className="prose prose-slate max-w-none prose-p:my-0 prose-headings:my-1 prose-headings:font-bold prose-pre:my-1">
                             <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({node, ...props}) => <p className="mb-1" {...props} />,
                                    img: ({node, ...props}) => <img className="max-h-96 rounded-lg my-2 shadow-sm border border-gray-100" {...props} />,
                                    code({node, inline, className, children, ...props}: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        if (!inline && match && match[1] === 'mermaid') return <MermaidDiagram definition={String(children).replace(/\n$/, '')} />;
                                        return !inline ? (
                                          <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm my-4 border border-gray-100"><code className={className} {...props}>{children}</code></pre>
                                        ) : (
                                          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-red-500 font-mono" {...props}>{children}</code>
                                        )
                                    },
                                }}
                             >{content}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HybridEditor;
