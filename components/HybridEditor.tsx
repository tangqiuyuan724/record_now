
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MermaidDiagram from './MermaidDiagram';
import TableEditor from './TableEditor';
import { generateId, convertFileToBase64, isTableLine } from '../utils/helpers';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  // Track where the cursor should be positioned when a block gains focus
  const [cursorOffset, setCursorOffset] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const initialized = useRef(false);

  // Parse Initial Content into Blocks
  useEffect(() => {
    if (!initialized.current) {
        if (content) {
            const lines = content.split('\n');
            const newBlocks: Block[] = [];
            let i = 0;
            
            while (i < lines.length) {
                const line = lines[i];
                
                // Code Block Detection (Group lines between ``` and ```)
                if (line.trim().startsWith('```')) {
                    const buffer = [line];
                    i++;
                    while(i < lines.length) {
                        buffer.push(lines[i]);
                        // Check for closing fence (allow leading spaces)
                        if (lines[i].trim().startsWith('```')) {
                            i++;
                            break;
                        }
                        i++;
                    }
                    newBlocks.push({ id: generateId(), content: buffer.join('\n'), type: 'text' });
                    continue;
                }

                // Table Detection
                if (isTableLine(line)) {
                    const buffer = [line];
                    i++;
                    while (i < lines.length && isTableLine(lines[i])) {
                        buffer.push(lines[i]);
                        i++;
                    }
                     newBlocks.push({ id: generateId(), content: buffer.join('\n'), type: 'table' });
                    continue;
                }
                
                // Regular Text Line
                newBlocks.push({ id: generateId(), content: line, type: 'text' });
                i++;
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
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;

      const currentBlock = prev[index];
      const oldContent = currentBlock.content;
      let shouldCreateNewBlock = false;
      
      // Logic: Detect if a code block was just closed
      if (newContent.trim().startsWith('```')) {
          const oldFences = (oldContent.match(/```/g) || []).length;
          const newFences = (newContent.match(/```/g) || []).length;
          
          // If we transitioned from having < 2 fences (open/incomplete) to >= 2 fences (closed)
          // AND the content ends with the fence (meaning user just typed it)
          if (oldFences < 2 && newFences >= 2 && newContent.trim().endsWith('```')) {
              shouldCreateNewBlock = true;
          }
      }

      const newBlocks = [...prev];
      newBlocks[index] = { ...currentBlock, content: newContent };
      
      if (shouldCreateNewBlock) {
          const newBlock: Block = { id: generateId(), content: '', type: 'text' };
          newBlocks.splice(index + 1, 0, newBlock);
          
          // Schedule focus update for the new block
          setTimeout(() => {
              setFocusedBlockId(newBlock.id);
              setCursorOffset(0);
          }, 0);
      }

      updateParent(newBlocks);
      return newBlocks;
    });
  };

  const handlePreviewClick = (e: React.MouseEvent, id: string) => {
    // Try to approximate the click position to set the cursor
    let offset = 0;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.anchorNode) {
        // This is a naive approximation. It works well for plain text.
        // For rich text, it gives the offset within the specific DOM node clicked.
        // Improving this requires complex DOM-to-Markdown mapping.
        offset = selection.anchorOffset;
    }
    
    setCursorOffset(offset);
    setFocusedBlockId(id);
  };

  const handleBlockPaste = (text: string, selectionStart: number, selectionEnd: number, index: number) => {
    const currentBlock = blocks[index];
    const beforeCursor = currentBlock.content.substring(0, selectionStart);
    const afterCursor = currentBlock.content.substring(selectionEnd);
    
    // Split pasted text by newlines
    const lines = text.split(/\r\n|\r|\n/);
    
    if (lines.length <= 1) return; // Should not happen based on caller check, but safety first

    const newBlocks: Block[] = [];
    
    // 1. Current block becomes the first part
    newBlocks.push({ ...currentBlock, content: beforeCursor + lines[0] });
    
    // 2. Middle lines become new blocks
    for (let i = 1; i < lines.length - 1; i++) {
        newBlocks.push({ id: generateId(), content: lines[i], type: 'text' });
    }
    
    // 3. Last part becomes the last block
    const lastLine = lines[lines.length - 1];
    const lastBlock: Block = { id: generateId(), content: lastLine + afterCursor, type: 'text' };
    newBlocks.push(lastBlock);
    
    setBlocks(prev => {
        const updated = [...prev];
        updated.splice(index, 1, ...newBlocks);
        updateParent(updated);
        return updated;
    });

    // Focus the last created block at the end of the pasted content
    // setTimeout needed to allow render cycle to create refs
    setTimeout(() => {
        setFocusedBlockId(lastBlock.id);
        setCursorOffset(lastLine.length);
    }, 0);
  };

  // --- Event Handlers ---

  const handleKeyDown = (e: React.KeyboardEvent, index: number, id: string) => {
    // Note: IME composition check is also handled in EditorBlock wrapper, 
    // but we keep this check here as a fallback or if logic moves.
    if (e.nativeEvent.isComposing) return;

    // ENTER: Create new block
    // Shift+Enter is naturally handled by textarea for new lines within the block
    if (e.key === 'Enter' && !e.shiftKey) {
      const currentBlock = blocks[index];
      
      // If we are inside a code block, EditorBlock handles Enter internally for newlines.
      // We only reach here if EditorBlock let it bubble (e.g. standard text).
      // However, for code blocks, EditorBlock now stops propagation for Enter.
      // Just in case:
      if (currentBlock.content.trim().startsWith('```')) {
          // If the block content is a closed code block, and we are at the very end...
          // Actually, let's rely on EditorBlock stopping propagation.
          return;
      }

      e.preventDefault();
      
      // Auto-Table Creation
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
        setCursorOffset(0); // New block starts at 0
        return newBlocks;
      });
    } 
    // BACKSPACE: Delete empty block
    else if (e.key === 'Backspace' && blocks[index].content === '') {
      if (index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        setCursorOffset(prevBlock.content.length); // Set cursor to end of previous block
        setFocusedBlockId(prevBlock.id);
        
        setBlocks(prev => {
            const newBlocks = prev.filter(b => b.id !== id);
            updateParent(newBlocks);
            return newBlocks;
        });
      }
    } 
    // NAVIGATION: Arrows
    else if (e.key === 'ArrowUp' && index > 0) {
        const textarea = e.currentTarget as HTMLTextAreaElement;
        const isFirstLine = textarea.value.substr(0, textarea.selectionStart).split('\n').length === 1;

        if (isFirstLine) {
             const prevBlock = blocks[index - 1];
             setCursorOffset(prevBlock.content.length); // Go to end of previous line
             setFocusedBlockId(prevBlock.id);
        }
    }
    else if (e.key === 'ArrowDown' && index < blocks.length - 1) {
        const textarea = e.currentTarget as HTMLTextAreaElement;
        const isLastLine = textarea.value.substr(textarea.selectionEnd).split('\n').length === 1;

        if (isLastLine) {
            setCursorOffset(0); // Go to start of next line
            setFocusedBlockId(blocks[index + 1].id);
        }
    }
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
            setCursorOffset(0);
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
                    cursorOffset={focusedBlockId === block.id ? cursorOffset : null}
                    onFocus={(e) => handlePreviewClick(e, block.id)}
                    onChange={(val) => updateBlockContent(block.id, val)}
                    onKeyDown={(e) => handleKeyDown(e, index, block.id)}
                    onPaste={(text, start, end) => handleBlockPaste(text, start, end, index)}
                />
            )}
        </React.Fragment>
      ))}
      
      {/* Empty space click handler to focus last block */}
      <div className="flex-1 min-h-[200px] cursor-text" onClick={() => {
            if (blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                setFocusedBlockId(lastBlock.id);
                setCursorOffset(lastBlock.content.length);
            } else {
                const newBlock: Block = { id: generateId(), content: '', type: 'text' };
                setBlocks([newBlock]);
                setFocusedBlockId(newBlock.id);
                setCursorOffset(0);
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
    cursorOffset: number | null;
    onFocus: (e: React.MouseEvent) => void;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onPaste: (text: string, selectionStart: number, selectionEnd: number) => void;
}

const EditorBlock: React.FC<EditorBlockProps> = ({ content, isFocused, cursorOffset, onFocus, onChange, onKeyDown, onPaste }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Ref to track IME composition state locally
    const isComposing = useRef(false);

    // Auto-resize when content changes
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    // Focus and Cursor Management
    useLayoutEffect(() => {
        if (isFocused && textareaRef.current) {
             textareaRef.current.focus();
             if (cursorOffset !== null) {
                try {
                    textareaRef.current.setSelectionRange(cursorOffset, cursorOffset);
                } catch (e) {
                    console.warn('Cursor offset out of bounds', e);
                }
             }
        }
    }, [isFocused, cursorOffset]);

    const handleKeyDownWrapper = (e: React.KeyboardEvent) => {
        // Prevent triggering parent block navigation/creation if IME is active.
        if (isComposing.current || e.nativeEvent.isComposing) {
            return;
        }

        const isCodeBlock = content.trim().startsWith('```');

        // Logic for Code Block Editing
        if (isCodeBlock && textareaRef.current) {
            // TAB: Insert 4 spaces
            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation

                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const spaces = "    "; // 4 spaces
                
                const newValue = content.substring(0, start) + spaces + content.substring(end);
                onChange(newValue);

                // Need to restore cursor position after state update
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + spaces.length;
                    }
                }, 0);
                return;
            }

            // ENTER: Newline + Auto-indent
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation so parent doesn't split block

                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                
                // Find start of current line to determine indentation
                const value = textarea.value;
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const currentLineToCursor = value.substring(lineStart, start);
                
                // Capture leading whitespace
                const match = currentLineToCursor.match(/^(\s*)/);
                const indent = match ? match[1] : '';
                
                const insertion = '\n' + indent;
                const newValue = content.substring(0, start) + insertion + content.substring(end);
                
                onChange(newValue);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + insertion.length;
                        // Trigger resize just in case
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
                    }
                }, 0);
                return;
            }
        }

        onKeyDown(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const text = e.clipboardData.getData('text/plain');
        const isCodeBlock = content.trim().startsWith('```');
        
        // If it's a code block, we typically want to paste as is (even multiline), 
        // the auto-resize in useEffect will handle visibility.
        // If it's a normal text block and contains newlines, we want to split blocks.
        if (!isCodeBlock && text.includes('\n')) {
            e.preventDefault();
            const textarea = e.currentTarget;
            onPaste(text, textarea.selectionStart, textarea.selectionEnd);
        }
        // Fallback: Default paste behavior happens, onChange triggers, content updates, useEffect resizes.
    };

    // Simple markdown syntax highlighter for the textarea input
    const getInputStyle = (text: string) => {
        if (text.startsWith('# ')) return 'text-3xl font-bold pb-2 mt-4';
        if (text.startsWith('## ')) return 'text-2xl font-bold pb-2 mt-3';
        if (text.startsWith('### ')) return 'text-xl font-bold pb-2 mt-2';
        if (text.startsWith('> ')) return 'italic text-gray-500 border-l-4 border-gray-300 pl-4 py-1';
        // Gray background for code block raw text (Editor Mode)
        if (text.trim().startsWith('```')) return 'font-mono text-sm bg-[#f6f8fa] p-3 rounded-lg text-gray-800 leading-relaxed';
        return 'text-base leading-relaxed'; 
    };

    return (
        <div className="min-h-[1.5em] mb-1 relative group">
            {isFocused ? (
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDownWrapper}
                    onPaste={handlePaste}
                    onCompositionStart={() => { isComposing.current = true; }}
                    onCompositionEnd={() => { isComposing.current = false; }}
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
                                    code({node, className, children, ...props}: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const language = match ? match[1] : '';
                                        
                                        if (language === 'mermaid') return <MermaidDiagram definition={String(children).replace(/\n$/, '')} />;
                                        
                                        if (match) {
                                          return (
                                            <SyntaxHighlighter
                                              {...props}
                                              children={String(children).replace(/\n$/, '')}
                                              style={vs}
                                              language={language}
                                              PreTag="div"
                                              CodeTag="code"
                                              customStyle={{
                                                  backgroundColor: 'transparent',
                                                  padding: 0,
                                                  margin: 0,
                                                  border: 'none',
                                                  boxShadow: 'none',
                                              }}
                                              codeTagProps={{
                                                  style: {
                                                      fontFamily: "inherit",
                                                      fontSize: 'inherit'
                                                  }
                                              }}
                                            />
                                          );
                                        }

                                        return (
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        );
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
