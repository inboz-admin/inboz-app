"use client";

import { memo } from "react";
import type { DividerConfig, CSSConfig } from "../types";

interface DividerElementProps {
  config: DividerConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

const DividerElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick 
}: DividerElementProps) => {
  const style: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor,
    borderColor: config.color || cssConfig.borderColor || '#e0e0e0',
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: cssConfig.textAlign,
    textDecoration: cssConfig.textDecoration,
    
    // Borders
    borderWidth: config.thickness || cssConfig.borderWidth || '1px',
    borderStyle: config.style || cssConfig.borderStyle || 'solid',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderRadius: cssConfig.borderRadius,
    
    // Spacing
    padding: cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft
      ? undefined
      : (cssConfig.padding || '0'),
    paddingTop: cssConfig.paddingTop,
    paddingRight: cssConfig.paddingRight,
    paddingBottom: cssConfig.paddingBottom,
    paddingLeft: cssConfig.paddingLeft,
    margin: cssConfig.marginTop || cssConfig.marginRight || cssConfig.marginBottom || cssConfig.marginLeft
      ? undefined
      : (cssConfig.margin || '20px 0'),
    marginTop: cssConfig.marginTop,
    marginRight: cssConfig.marginRight,
    marginBottom: cssConfig.marginBottom,
    marginLeft: cssConfig.marginLeft,
    
    // Layout
    width: config.width || cssConfig.width || '100%',
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <hr style={style} onClick={onClick} />
  );
});

DividerElement.displayName = "DividerElement";

export default DividerElement;

