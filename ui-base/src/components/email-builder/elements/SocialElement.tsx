"use client";

import { memo } from "react";
import type { SocialConfig, CSSConfig } from "../types";
import { 
  Share2,
  Link as LinkIcon,
  Globe
} from "lucide-react";

interface SocialElementProps {
  config: SocialConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

// Use generic icons since specific social media icons may not be available in lucide-react
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  facebook: Share2,
  twitter: Share2,
  linkedin: Share2,
  instagram: Share2,
  youtube: Share2,
  github: Share2,
};

const SocialElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick 
}: SocialElementProps) => {
  const platforms = config.platforms || [];
  const size = config.size || 'medium';
  const iconSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;

  const style: React.CSSProperties = {
    // Colors
    backgroundColor: cssConfig.backgroundColor,
    color: cssConfig.color || '#333',
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize,
    fontWeight: cssConfig.fontWeight,
    lineHeight: cssConfig.lineHeight,
    textAlign: config.alignment || cssConfig.textAlign || 'center',
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

  if (platforms.length === 0) {
    return (
      <div style={style} onClick={onClick}>
        <span style={{ color: '#999', fontSize: '14px' }}>No social links added</span>
      </div>
    );
  }

  return (
    <div style={style} onClick={onClick}>
      {platforms.map((platform, index) => {
        const IconComponent = iconMap[platform.platform];
        if (!IconComponent) return null;

        return (
          <a
            key={index}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              margin: '0 8px',
              color: cssConfig.color || '#333',
              textDecoration: 'none',
            }}
            onClick={(e) => {
              if (onClick) {
                e.preventDefault();
                onClick();
              }
            }}
          >
            <IconComponent size={iconSize} />
          </a>
        );
      })}
    </div>
  );
});

SocialElement.displayName = "SocialElement";

export default SocialElement;

