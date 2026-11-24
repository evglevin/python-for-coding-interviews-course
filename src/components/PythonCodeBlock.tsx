import React, { useMemo, useState } from 'react';
import { Check, Copy, ArrowRightToLine } from 'lucide-react';
import { highlightPythonCode, pythonHighlighting } from '../lib/pythonHighlighting';

interface PythonCodeBlockProps {
  code: string;
  theme: 'dark' | 'light';
  caption?: string;
  onApplyToEditor?: () => void;
  maxHeight?: string;
}

export const PythonCodeBlock: React.FC<PythonCodeBlockProps> = ({
  code,
  theme,
  caption,
  onApplyToEditor,
  maxHeight,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const { style, foreground } = pythonHighlighting[theme];
  const source = code.trimEnd();
  const highlightedCode = useMemo(
    () =>
      highlightPythonCode(source, style).map(({ text, classes }, i) =>
        classes ? <span key={i} className={classes}>{text}</span> : text
      ),
    [source, style]
  );

  return (
    <div
      className="my-3 overflow-hidden rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-code)',
        color: foreground,
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1.5 text-xs"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <span className="font-medium">{caption ?? 'Python'}</span>
        <div className="flex items-center gap-1.5">
          {onApplyToEditor && (
            <button
              type="button"
              onClick={onApplyToEditor}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Load solution into editor"
            >
              <ArrowRightToLine className="h-3.5 w-3.5" />
              Load in Editor
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <pre
        className="overflow-x-auto p-3.5 font-mono text-[13.5px] leading-[1.65]"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <code>{highlightedCode}</code>
      </pre>
    </div>
  );
};
