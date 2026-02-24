"use client";

import { memo, useRef, useCallback, useState, useEffect } from "react";
import type { ImageConfig, CSSConfig } from "../types";

interface ImageElementProps {
  config: ImageConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  onResize?: (width: string, height: string) => void;
}

type ResizeHandle = "right" | "bottom" | "bottom-right";

const ImageElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  onResize,
}: ImageElementProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);
  const dragState = useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();

      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      dragState.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        aspectRatio: rect.width / rect.height,
      };
      setResizing(true);
    },
    []
  );

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragState.current;
      if (!state) return;

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;

      switch (state.handle) {
        case "right":
          newWidth = Math.max(30, state.startWidth + deltaX);
          newHeight = newWidth / state.aspectRatio;
          break;
        case "bottom":
          newHeight = Math.max(30, state.startHeight + deltaY);
          newWidth = newHeight * state.aspectRatio;
          break;
        case "bottom-right":
          newWidth = Math.max(30, state.startWidth + deltaX);
          newHeight = newWidth / state.aspectRatio;
          break;
      }

      const img = imgRef.current;
      if (img) {
        img.style.width = `${Math.round(newWidth)}px`;
        img.style.height = `${Math.round(newHeight)}px`;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const state = dragState.current;
      if (!state || !onResize) {
        setResizing(false);
        dragState.current = null;
        return;
      }

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;

      switch (state.handle) {
        case "right":
          newWidth = Math.max(30, state.startWidth + deltaX);
          newHeight = newWidth / state.aspectRatio;
          break;
        case "bottom":
          newHeight = Math.max(30, state.startHeight + deltaY);
          newWidth = newHeight * state.aspectRatio;
          break;
        case "bottom-right":
          newWidth = Math.max(30, state.startWidth + deltaX);
          newHeight = newWidth / state.aspectRatio;
          break;
      }

      onResize(`${Math.round(newWidth)}px`, `${Math.round(newHeight)}px`);
      setResizing(false);
      dragState.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, onResize]);

  const style: React.CSSProperties = {
    backgroundColor: cssConfig.backgroundColor,
    borderColor: cssConfig.borderColor,
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: cssConfig.textAlign || (config.alignment || 'center'),
    textDecoration: cssConfig.textDecoration,
    padding: cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft
      ? undefined
      : (cssConfig.padding || '10px'),
    paddingTop: cssConfig.paddingTop,
    paddingRight: cssConfig.paddingRight,
    paddingBottom: cssConfig.paddingBottom,
    paddingLeft: cssConfig.paddingLeft,
    margin: cssConfig.marginTop || cssConfig.marginRight || cssConfig.marginBottom || cssConfig.marginLeft
      ? undefined
      : (cssConfig.margin || '0'),
    marginTop: cssConfig.marginTop,
    marginRight: cssConfig.marginRight,
    marginBottom: cssConfig.marginBottom,
    marginLeft: cssConfig.marginLeft,
    borderRadius: cssConfig.borderRadius,
    ...(cssConfig.borderWidth ? {
      borderWidth: cssConfig.borderWidth,
      borderStyle: cssConfig.borderStyle || 'solid',
      borderColor: cssConfig.borderColor || 'transparent',
    } : {}),
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: resizing ? 'nwse-resize' : onClick ? 'pointer' : 'default',
    position: 'relative',
  };

  const imgStyle: React.CSSProperties = {
    width: config.width || '100%',
    height: config.height || (config.width ? 'auto' : '100%'),
    objectFit: config.height ? 'cover' : 'contain',
    display: 'block',
    margin: '0 auto',
    userSelect: 'none',
    pointerEvents: resizing ? 'none' : 'auto',
  };

  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#9333ea',
    border: '1.5px solid white',
    borderRadius: 2,
    cursor,
    zIndex: 20,
    boxShadow: '0 0 2px rgba(0,0,0,0.3)',
  });

  const img = (
    <img 
      ref={imgRef}
      src={config.src || 'https://via.placeholder.com/600x300?text=Image'} 
      alt={config.alt || ''}
      style={imgStyle}
      draggable={false}
    />
  );

  const resizeHandles = isSelected && onResize && (
    <>
      {/* Right-center handle */}
      <div
        style={{ ...handleStyle('ew-resize'), right: -5, top: '50%', transform: 'translateY(-50%)' }}
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      {/* Bottom-center handle */}
      <div
        style={{ ...handleStyle('ns-resize'), bottom: -5, left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      {/* Bottom-right corner handle */}
      <div
        style={{ ...handleStyle('nwse-resize'), right: -5, bottom: -5 }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
    </>
  );

  if (config.link) {
    return (
      <div ref={containerRef} style={style} onClick={onClick}>
        <a href={config.link} style={{ textDecoration: 'none' }}>
          {img}
        </a>
        {resizeHandles}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={style} onClick={onClick}>
      {img}
      {resizeHandles}
    </div>
  );
});

ImageElement.displayName = "ImageElement";

export default ImageElement;
