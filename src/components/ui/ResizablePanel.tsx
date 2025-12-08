'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  resizeFrom?: 'left' | 'right';
  onResize?: (width: number) => void;
}

export function ResizablePanel({
  children,
  defaultWidth = 490,
  minWidth = 490,
  maxWidth = 800,
  className = '',
  resizeFrom = 'left',
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = resizeFrom === 'left'
      ? startXRef.current - e.clientX
      : e.clientX - startXRef.current;

    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
    setWidth(newWidth);
    onResize?.(newWidth);
  }, [isResizing, minWidth, maxWidth, resizeFrom, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group ${
          resizeFrom === 'left' ? 'left-0 -ml-0.5' : 'right-0 -mr-0.5'
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div
          className={`absolute inset-y-0 w-1 transition-colors ${
            isResizing
              ? 'bg-primary'
              : 'bg-transparent hover:bg-primary/50 group-hover:bg-primary/30'
          }`}
        />
        {/* Larger hit area */}
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Content */}
      <div className="h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
