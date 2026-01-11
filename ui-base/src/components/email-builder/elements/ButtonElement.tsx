"use client";

import { memo } from "react";
import type { ButtonConfig, CSSConfig } from "../types";
import { replaceVariables } from "./utils";

interface ButtonElementProps {
  config: ButtonConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  previewData?: Record<string, string>;
}

const ButtonElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  previewData 
}: ButtonElementProps) => {
  const text = previewData 
    ? replaceVariables(config.text || '', previewData)
    : config.text || 'Button';

  const baseStyle: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor || '#007bff',
    color: cssConfig.color || '#ffffff',
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize || '16px',
    fontWeight: cssConfig.fontWeight || '600',
    lineHeight: cssConfig.lineHeight || '1.5',
    textAlign: cssConfig.textAlign || 'center',
    textDecoration: cssConfig.textDecoration || 'none',
    display: 'inline-block',
    
    // Spacing
    padding: cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft
      ? undefined
      : (cssConfig.padding || '12px 24px'),
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
    borderRadius: cssConfig.borderRadius || '4px',
    ...(cssConfig.borderWidth ? {
      borderWidth: cssConfig.borderWidth,
      borderStyle: cssConfig.borderStyle || 'solid',
      borderColor: cssConfig.borderColor || 'transparent',
    } : { border: 'none' }),
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  // Size adjustments
  if (config.size === 'small') {
    baseStyle.padding = '8px 16px';
    baseStyle.fontSize = '14px';
  } else if (config.size === 'large') {
    baseStyle.padding = '16px 32px';
    baseStyle.fontSize = '18px';
  }

  // Style variations
  if (config.style === 'secondary') {
    baseStyle.backgroundColor = cssConfig.backgroundColor || '#6c757d';
  } else if (config.style === 'outline') {
    baseStyle.backgroundColor = 'transparent';
    baseStyle.border = `2px solid ${cssConfig.borderColor || baseStyle.color}`;
    baseStyle.color = cssConfig.borderColor || baseStyle.color;
  }

  return (
    <div style={{ textAlign: cssConfig.textAlign || 'center', padding: '10px' }}>
      <a 
        href={config.link || '#'} 
        style={baseStyle}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {text}
      </a>
    </div>
  );
});

ButtonElement.displayName = "ButtonElement";

export default ButtonElement;

