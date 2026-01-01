
import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface TableEditorProps {
    content: string;
    onChange: (val: string) => void;
}

// --- Helper Functions for Table Parsing ---

const parseMarkdownTable = (md: string) => {
  const lines = md.trim().split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return null;

  const parseRow = (line: string) => {
    const content = line.trim().replace(/^\||\|$/g, '');
    return content.split('|').map(c => c.trim());
  };

  const headers = parseRow(lines[0]);
  const alignmentLine = parseRow(lines[1]);
  const alignments = alignmentLine.map(s => {
    if (s.startsWith(':') && s.endsWith(':')) return 'center';
    if (s.endsWith(':')) return 'right';
    return 'left';
  });
  const rows = lines.slice(2).map(parseRow);

  return { headers, alignments, rows };
};

const serializeTable = (headers: string[], alignments: string[], rows: string[][]) => {
  const formatRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const alignRow = alignments.map(a => {
    if (a === 'center') return ':---:';
    if (a === 'right') return '---:';
    return '---'; 
  });

  return [
    formatRow(headers),
    formatRow(alignRow),
    ...rows.map(row => formatRow(row))
  ].join('\n');
};

const TableEditor: React.FC<TableEditorProps> = ({ content, onChange }) => {
    // Initialize state from prop
    const [data, setData] = useState(() => parseMarkdownTable(content) || { 
        headers: ['Header 1', 'Header 2'], 
        alignments: ['left', 'left'], 
        rows: [['Cell 1', 'Cell 2']] 
    });

    const updateMarkdown = (newData: typeof data) => {
        setData(newData);
        onChange(serializeTable(newData.headers, newData.alignments as string[], newData.rows));
    };

    // --- Actions ---

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = { ...data };
        if (rowIndex === -1) newData.headers[colIndex] = value;
        else newData.rows[rowIndex][colIndex] = value;
        updateMarkdown(newData);
    };

    const addColumn = (index: number) => {
        const newData = { ...data };
        newData.headers.splice(index + 1, 0, 'New');
        newData.alignments.splice(index + 1, 0, 'left');
        newData.rows.forEach(row => row.splice(index + 1, 0, ''));
        updateMarkdown(newData);
    };

    const addRow = (index: number) => {
        const newData = { ...data };
        const newRow = new Array(newData.headers.length).fill('');
        newData.rows.splice(index + 1, 0, newRow);
        updateMarkdown(newData);
    };
    
    const removeColumn = (index: number) => {
        if (data.headers.length <= 1) return;
        const newData = { ...data };
        newData.headers.splice(index, 1);
        newData.alignments.splice(index, 1);
        newData.rows.forEach(row => row.splice(index, 1));
        updateMarkdown(newData);
    };

    const removeRow = (index: number) => {
        const newData = { ...data };
        newData.rows.splice(index, 1);
        if (newData.rows.length === 0) newData.rows.push(new Array(newData.headers.length).fill(''));
        updateMarkdown(newData);
    };

    const setAlignment = (colIndex: number, align: string) => {
        const newData = { ...data };
        newData.alignments[colIndex] = align;
        updateMarkdown(newData);
    };

    const moveRow = (from: number, to: number) => {
        if (to < 0 || to >= data.rows.length) return;
        const newData = { ...data };
        const row = newData.rows[from];
        newData.rows.splice(from, 1);
        newData.rows.splice(to, 0, row);
        updateMarkdown(newData);
    };
    
    return (
        <div className="overflow-x-auto my-6 px-2 pb-2 bg-white rounded-xl border border-gray-200 shadow-sm relative group ring-4 ring-gray-50/50 pt-16">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th className="w-8 border-none bg-gray-50 rounded-tl-lg"></th> 
                        {data.headers.map((header, colIndex) => (
                            <th key={colIndex} className="border-b border-r border-gray-200 bg-gray-50 py-3 px-2 relative min-w-[120px] group/col last:rounded-tr-lg">
                                <input 
                                    value={header} 
                                    onChange={(e) => handleCellChange(-1, colIndex, e.target.value)}
                                    className="w-full bg-transparent font-bold text-center text-gray-700 focus:outline-none rounded px-1 py-0.5"
                                />
                                {/* Column Toolbar */}
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 h-9 bg-white shadow-xl rounded-lg border border-gray-100 hidden group-hover/col:flex items-center justify-center gap-1 z-50 px-2 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap">
                                    <button onClick={() => setAlignment(colIndex, 'left')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><AlignLeft size={14}/></button>
                                    <button onClick={() => setAlignment(colIndex, 'center')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><AlignCenter size={14}/></button>
                                    <button onClick={() => setAlignment(colIndex, 'right')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><AlignRight size={14}/></button>
                                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                    <button onClick={() => removeColumn(colIndex)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                </div>
                            </th>
                        ))}
                         <th className="w-8 border-none bg-transparent align-middle">
                             <button onClick={() => addColumn(data.headers.length - 1)} className="ml-1 p-1 hover:bg-blue-100 text-blue-500 rounded-full transition-colors"><Plus size={14}/></button>
                         </th>
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="group/row hover:bg-gray-50/30">
                            <td className="w-8 text-center text-gray-400 opacity-0 group-hover/row:opacity-100 relative border-none">
                                <div className="flex flex-col items-center justify-center gap-0.5 absolute right-1 top-1/2 -translate-y-1/2 bg-white shadow-md border border-gray-100 rounded p-0.5 z-10">
                                    <button onClick={() => moveRow(rowIndex, rowIndex - 1)} className="hover:text-blue-500 p-0.5"><ArrowUp size={10}/></button>
                                    <button onClick={() => removeRow(rowIndex)} className="text-red-300 hover:text-red-500 p-0.5"><Trash2 size={10}/></button>
                                    <button onClick={() => moveRow(rowIndex, rowIndex + 1)} className="hover:text-blue-500 p-0.5"><ArrowDown size={10}/></button>
                                </div>
                            </td>
                            {row.map((cell, colIndex) => (
                                <td key={colIndex} className="border border-gray-200 p-0 bg-white">
                                    <input 
                                        value={cell} 
                                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                        className={`w-full bg-transparent focus:outline-none px-3 py-2 text-gray-700 ${data.alignments[colIndex] === 'center' ? 'text-center' : data.alignments[colIndex] === 'right' ? 'text-right' : 'text-left'}`}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={() => addRow(data.rows.length - 1)} className="w-full mt-2 h-8 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg border border-dashed border-gray-300 text-xs font-medium">
                <Plus size={14} className="mr-1"/> Add Row
            </button>
        </div>
    );
};

export default TableEditor;
