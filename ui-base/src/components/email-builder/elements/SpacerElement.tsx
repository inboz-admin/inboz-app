"use client";

import { memo } from "react";
import type { SpacerConfig, CSSConfig } from "../types";

interface SpacerElementProps {
  config: SpacerConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

const SpacerElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick 
}: SpacerElementProps) => {
  const style: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor || (isSelected ? 'rgba(0, 123, 255, 0.1)' : 'transparent'),
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
      : (cssConfig.padding || '0'),
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
      borderColor: cssConfig.borderColor || 'transparent',
    } : {}),
    
    // Layout
    height: config.height || cssConfig.height || '20px',
    width: cssConfig.width || '100%',
    
    // Selection
    outline: isSelected ? '2px dashed #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <div style={style} onClick={onClick} />
  );
});

SpacerElement.displayName = "SpacerElement";

export default SpacerElement;

