
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MermaidDiagram from './MermaidDiagram';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PreviewProps {
  content: string;
  className?: string;
}

const Preview: React.FC<PreviewProps> = ({ content, className }) => {
  return (
    <div className={`markdown-body prose prose-slate prose-lg max-w-none focus:outline-none ${className || ''}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language === 'mermaid') {
                return <MermaidDiagram definition={String(children).replace(/\n$/, '')} />;
            }

            return !inline && match ? (
              <SyntaxHighlighter
                {...props}
                children={String(children).replace(/\n$/, '')}
                style={vs}
                language={language}
                PreTag="div"
                className="rounded-lg text-sm border border-gray-200 shadow-sm my-4 !bg-gray-50"
              />
            ) : (
              <code className={inline ? "bg-gray-100 text-red-500 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" : "bg-gray-50 rounded-lg p-4 block overflow-x-auto text-sm my-4 border border-gray-100"} {...props}>
                {children}
              </code>
            )
          },
          // Custom styling for other elements to match Typora/Mac feel
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-gray-100" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-500 my-4" {...props} />,
          a: ({node, ...props}) => <a className="text-blue-500 hover:underline cursor-pointer" {...props} />,
          img: ({node, ...props}) => <img className="rounded-lg shadow-sm max-w-full my-4" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 my-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 my-2" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Preview;
