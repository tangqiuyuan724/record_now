import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
});

interface MermaidDiagramProps {
  definition: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ definition }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      if (!definition) return;
      
      try {
        setError('');
        // Unique ID for each render to prevent collisions
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Mermaid expects the element to exist in DOM for some operations, but render returns string
        const { svg } = await mermaid.render(id, definition);
        
        if (mounted) {
            setSvg(svg);
        }
      } catch (e) {
        if (mounted) {
            console.error('Mermaid render error:', e);
            // Mermaid usually provides visual error feedback, but we can fallback
            setError('Invalid Diagram Syntax');
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [definition]);

  if (error) {
    return (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-mono">
            {error}
            <pre className="mt-2 text-xs text-gray-500 opacity-70">{definition}</pre>
        </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        className="mermaid my-6 flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default MermaidDiagram;