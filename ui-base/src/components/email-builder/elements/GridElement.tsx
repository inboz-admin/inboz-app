"use client";

import { memo } from "react";
import type { GridConfig, CSSConfig } from "../types";
import { replaceVariables } from "./utils";

interface GridElementProps {
  config: GridConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  previewData?: Record<string, string>;
}

const GridElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  previewData 
}: GridElementProps) => {
  const columns = config.columns || 2;
  const items = config.items || [];
  const gap = config.gap || '10px';

  const containerStyle: React.CSSProperties = {
    // Layout
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: gap,
    
    // Colors
    backgroundColor: cssConfig.backgroundColor,
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: cssConfig.textAlign || 'center',
    textDecoration: cssConfig.textDecoration,
    
    // Spacing
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
    
    // Borders
    borderRadius: cssConfig.borderRadius,
    ...(cssConfig.borderWidth ? {
      borderWidth: cssConfig.borderWidth,
      borderStyle: cssConfig.borderStyle || 'solid',
      borderColor: cssConfig.borderColor || '#e0e0e0',
    } : {}),
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  const itemStyle: React.CSSProperties = {
    color: cssConfig.color || '#000000',
    fontSize: cssConfig.fontSize || '16px',
    fontWeight: cssConfig.fontWeight || '400',
    lineHeight: cssConfig.lineHeight || '1.5',
    textAlign: cssConfig.textAlign || 'center',
    padding: '10px',
    backgroundColor: cssConfig.backgroundColor ? 'transparent' : undefined,
  };

  return (
    <div style={containerStyle} onClick={onClick}>
      {items.map((item, index) => {
        const content = previewData 
          ? replaceVariables(item.content, previewData)
          : item.content;
        
        const itemContent = item.image ? (
          <div>
            {item.link ? (
              <a href={item.link} style={{ textDecoration: 'none' }}>
                <img 
                  src={item.image} 
                  alt={content}
                  style={{ width: '100%', height: 'auto', marginBottom: '8px' }}
                />
                <div style={itemStyle}>{content}</div>
              </a>
            ) : (
              <>
                <img 
                  src={item.image} 
                  alt={content}
                  style={{ width: '100%', height: 'auto', marginBottom: '8px' }}
                />
                <div style={itemStyle}>{content}</div>
              </>
            )}
          </div>
        ) : (
          <div style={itemStyle}>
            {item.link ? (
              <a href={item.link} style={{ color: 'inherit', textDecoration: 'none' }}>
                {content}
              </a>
            ) : (
              content
            )}
          </div>
        );

        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
            {itemContent}
          </div>
        );
      })}
    </div>
  );
});

GridElement.displayName = "GridElement";

export default GridElement;

