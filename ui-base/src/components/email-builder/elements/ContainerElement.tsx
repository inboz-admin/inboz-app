"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { ContainerConfig, CSSConfig, BuilderElement } from "../types";

interface ContainerElementProps {
  config: ContainerConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  children?: BuilderElement[];
  onRenderChild?: (element: BuilderElement) => React.ReactNode;
  containerId?: string;
}

const ContainerElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  children = [],
  onRenderChild,
  containerId,
}: ContainerElementProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: containerId || 'container-drop-zone',
  });
  const containerStyle: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor || '#ffffff',
    color: cssConfig.color || '#000000', // Default to black if not set
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: cssConfig.textAlign,
    textDecoration: cssConfig.textDecoration,
    
    // Spacing
    padding: cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft
      ? undefined
      : (cssConfig.padding || '20px'),
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
    
    // Borders
    borderRadius: cssConfig.borderRadius,
    ...(cssConfig.borderWidth ? {
      borderWidth: cssConfig.borderWidth,
      borderStyle: cssConfig.borderStyle || 'solid',
      borderColor: cssConfig.borderColor || '#e0e0e0',
    } : {}),
    
    // Layout
    width: '100%',
    height: cssConfig.height,
    minHeight: '100px',
    minWidth: '100px',
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  // Apply layout styles based on layoutType only if no children
  // (if there are children, flex/grid will be applied to the children wrapper instead)
  if (children.length === 0) {
    if (config.layoutType === 'flex') {
      containerStyle.display = 'flex';
      containerStyle.flexDirection = config.flexDirection || 'row';
      containerStyle.flexWrap = config.flexWrap || 'nowrap';
      containerStyle.justifyContent = config.justifyContent || 'flex-start';
      containerStyle.alignItems = config.alignItems || 'stretch';
      containerStyle.gap = config.gap || '10px';
      containerStyle.width = '100%';
      containerStyle.flex = '1 1 auto';
    } else if (config.layoutType === 'grid') {
      containerStyle.display = 'grid';
      containerStyle.gridTemplateColumns = config.gridColumns 
        ? `repeat(${config.gridColumns}, 1fr)`
        : 'repeat(2, 1fr)';
      if (config.gridRows) {
        containerStyle.gridTemplateRows = `repeat(${config.gridRows}, 1fr)`;
      }
      containerStyle.gap = config.gap || '10px';
      containerStyle.justifyItems = config.justifyContent === 'center' ? 'center' 
        : config.justifyContent === 'flex-end' ? 'end' 
        : 'start';
      containerStyle.alignItems = config.alignItems || 'stretch';
    }
  }

  const dropZoneStyle: React.CSSProperties = {
    ...containerStyle,
    minHeight: '100px',
  };

  // Create flex/grid styles for the children wrapper
  const childrenWrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: cssConfig.color || 'inherit',
    position: 'relative',
  };

  // Apply flex/grid layout to children wrapper
  if (config.layoutType === 'flex') {
    childrenWrapperStyle.display = 'flex';
    childrenWrapperStyle.flexDirection = config.flexDirection || 'row';
    childrenWrapperStyle.flexWrap = config.flexWrap || 'nowrap';
    childrenWrapperStyle.justifyContent = config.justifyContent || 'flex-start';
    childrenWrapperStyle.alignItems = config.alignItems || 'stretch';
    childrenWrapperStyle.gap = config.gap || '10px';
  } else if (config.layoutType === 'grid') {
    childrenWrapperStyle.display = 'grid';
    childrenWrapperStyle.gridTemplateColumns = config.gridColumns 
      ? `repeat(${config.gridColumns}, 1fr)`
      : 'repeat(2, 1fr)';
    if (config.gridRows) {
      childrenWrapperStyle.gridTemplateRows = `repeat(${config.gridRows}, 1fr)`;
    }
    childrenWrapperStyle.gap = config.gap || '10px';
    childrenWrapperStyle.justifyItems = config.justifyContent === 'center' ? 'center' 
      : config.justifyContent === 'flex-end' ? 'end' 
      : 'start';
    childrenWrapperStyle.alignItems = config.alignItems || 'stretch';
  }

  return (
    <div 
      ref={setNodeRef}
      style={dropZoneStyle} 
      onClick={(e) => {
        // Only select if clicking directly on container, not on children
        if (e.target === e.currentTarget || (e.target as HTMLElement).textContent === 'Drop elements here') {
          onClick?.();
        }
      }}
    >
      {children.length === 0 ? (
        <div style={{ 
          color: cssConfig.color || '#999', 
          textAlign: 'center', 
          padding: '20px',
          fontStyle: 'italic',
          width: '100%',
          boxSizing: 'border-box',
          pointerEvents: 'none', // Don't block drop events
        }}>
          Drop elements here
        </div>
      ) : (
        <div 
          style={childrenWrapperStyle}
          onDragOver={(e) => {
            // Allow drops on the container even when it has children
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {children.map((child) => (
            <div 
              key={child.id} 
              style={{ 
                minWidth: 0,
                color: 'inherit', // Inherit container color
                position: 'relative',
                zIndex: 1, // Ensure children are above container background but don't block drops
              }}
            >
              {onRenderChild ? onRenderChild(child) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ContainerElement.displayName = "ContainerElement";

export default ContainerElement;

