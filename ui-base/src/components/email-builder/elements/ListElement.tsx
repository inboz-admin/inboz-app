"use client";

import { memo } from "react";
import type { ListConfig, CSSConfig } from "../types";
import { replaceVariables } from "./utils";

interface ListElementProps {
  config: ListConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  previewData?: Record<string, string>;
}

const ListElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  previewData 
}: ListElementProps) => {
  const items = config.items || [];
  const processedItems = previewData 
    ? items.map(item => replaceVariables(item, previewData))
    : items;

  const style: React.CSSProperties = {
    // Colors
    color: cssConfig.color || '#000000',
    backgroundColor: cssConfig.backgroundColor,
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize || '16px',
    fontWeight: cssConfig.fontWeight || '400',
    lineHeight: cssConfig.lineHeight || '1.5',
    textAlign: cssConfig.textAlign || 'left',
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
      borderColor: cssConfig.borderColor || '#e0e0e0',
    } : {}),
    
    // List specific
    listStyleType: config.listType === 'ordered' ? 'decimal' : 'disc',
    listStylePosition: 'inside',
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
  };

  const ListTag = config.listType === 'ordered' ? 'ol' : 'ul';
  
  // Apply alignment to list items
  const listItemStyle: React.CSSProperties = {
    textAlign: config.alignment || cssConfig.textAlign || 'left',
  };

  return (
    <ListTag style={style} onClick={onClick}>
      {processedItems.map((item, index) => (
        <li key={index} style={listItemStyle}>{item}</li>
      ))}
    </ListTag>
  );
});

ListElement.displayName = "ListElement";

export default ListElement;

