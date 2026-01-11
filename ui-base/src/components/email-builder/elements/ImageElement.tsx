"use client";

import { memo } from "react";
import type { ImageConfig, CSSConfig } from "../types";

interface ImageElementProps {
  config: ImageConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

const ImageElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick 
}: ImageElementProps) => {
  const style: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor,
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: cssConfig.textAlign || (config.alignment || 'center'),
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
      borderColor: cssConfig.borderColor || 'transparent',
    } : {}),
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  const imgStyle: React.CSSProperties = {
    width: config.width || '100%',
    height: config.height || (config.width ? 'auto' : '100%'),
    objectFit: config.height ? 'cover' : 'contain',
    display: 'block',
    margin: '0 auto',
  };

  const img = (
    <img 
      src={config.src || 'https://via.placeholder.com/600x300?text=Image'} 
      alt={config.alt || ''}
      style={imgStyle}
    />
  );

  if (config.link) {
    return (
      <div style={style} onClick={onClick}>
        <a href={config.link} style={{ textDecoration: 'none' }}>
          {img}
        </a>
      </div>
    );
  }

  return (
    <div style={style} onClick={onClick}>
      {img}
    </div>
  );
});

ImageElement.displayName = "ImageElement";

export default ImageElement;

