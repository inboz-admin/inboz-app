"use client";

import { memo } from "react";
import type { SectionConfig, CSSConfig } from "../types";

interface SectionElementProps {
  config: SectionConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

const SectionElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  children 
}: SectionElementProps) => {
  const style: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor || '#ffffff',
    color: cssConfig.color || '#000000',
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: config.alignment || cssConfig.textAlign || 'center',
    textDecoration: cssConfig.textDecoration,
    
    // Spacing - use individual padding/margin if specified, otherwise use shorthand
    padding: cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft
      ? undefined
      : (config.padding || cssConfig.padding || '20px'),
    paddingTop: cssConfig.paddingTop,
    paddingRight: cssConfig.paddingRight,
    paddingBottom: cssConfig.paddingBottom,
    paddingLeft: cssConfig.paddingLeft,
    margin: cssConfig.marginTop || cssConfig.marginRight || cssConfig.marginBottom || cssConfig.marginLeft
      ? undefined
      : (cssConfig.margin || '0 auto'),
    marginTop: cssConfig.marginTop,
    marginRight: cssConfig.marginRight,
    marginBottom: cssConfig.marginBottom,
    marginLeft: cssConfig.marginLeft,
    
    // Borders
    borderRadius: cssConfig.borderRadius,
    ...(cssConfig.borderWidth ? {
      borderWidth: cssConfig.borderWidth,
      borderStyle: cssConfig.borderStyle || 'solid',
      borderColor: cssConfig.borderColor || 'transparent',
    } : {}),
    
    // Layout
    width: cssConfig.width || '100%',
    maxWidth: config.maxWidth || cssConfig.maxWidth || '600px',
    height: cssConfig.height,
    display: cssConfig.display,
    alignItems: cssConfig.alignItems,
    justifyContent: cssConfig.justifyContent,
    
    // Selection outline
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <div style={style} onClick={onClick}>
      {config.content ? (
        <div dangerouslySetInnerHTML={{ __html: config.content }} />
      ) : (
        children || <div style={{ minHeight: '50px', color: '#999', fontStyle: 'italic' }}>Section (add content in config)</div>
      )}
    </div>
  );
});

SectionElement.displayName = "SectionElement";

export default SectionElement;

