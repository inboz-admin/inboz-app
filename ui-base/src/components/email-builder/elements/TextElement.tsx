"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import type { TextConfig, CSSConfig } from "../types";
import { replaceVariables } from "./utils";

interface TextElementProps {
  config: TextConfig;
  cssConfig: CSSConfig;
  isSelected?: boolean;
  onClick?: () => void;
  onContentChange?: (content: string) => void;
  previewData?: Record<string, string>;
}

const TextElement = memo(({ 
  config, 
  cssConfig, 
  isSelected = false,
  onClick,
  onContentChange,
  previewData 
}: TextElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(config.content || '');
  const editRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setEditContent(config.content || '');
  }, [config.content]);

  useEffect(() => {
    if (isEditing && editRef.current) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (editRef.current) {
          editRef.current.focus();
          // Move cursor to end
          const range = document.createRange();
          range.selectNodeContents(editRef.current);
          range.collapse(false); // Move to end
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 0);
    }
  }, [isEditing]);

  const content = previewData && !isEditing
    ? replaceVariables(config.content || '', previewData)
    : (isEditing ? editContent : config.content || '');

  // Helper function to render content with line breaks
  const renderContentWithLineBreaks = (text: string) => {
    if (!text) return '\u00A0';
    const lines = text.split('\n');
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const style: React.CSSProperties = {
    // Colors
    color: cssConfig.color || '#000000',
    backgroundColor: cssConfig.backgroundColor,
    borderColor: cssConfig.borderColor,
    
    // Typography
    fontFamily: cssConfig.fontFamily || 'Inter, sans-serif',
    fontSize: cssConfig.fontSize || '16px',
    fontWeight: cssConfig.fontWeight || '400',
    fontStyle: cssConfig.fontStyle || 'normal',
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
    
    // Selection
    outline: isSelected ? '2px solid #9333ea' : 'none',
    cursor: onClick ? 'pointer' : 'default',
    minHeight: '1.5em',
    minWidth: '50px',
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (onContentChange) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (onContentChange && isEditing) {
      onContentChange(editContent);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onContentChange) {
        onContentChange(editContent);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditContent(config.content || '');
      setIsEditing(false);
    }
    // Don't prevent default for other keys to allow normal typing
  };

  if (config.isHeading && config.headingLevel) {
    const HeadingTag = `h${config.headingLevel}` as keyof JSX.IntrinsicElements;
    
    if (isEditing && onContentChange) {
      return (
        <HeadingTag
          ref={(node) => {
            if (node && editRef.current !== node) {
              editRef.current = node;
              // Set initial content if empty
              if (!node.textContent || node.textContent === '\u00A0') {
                node.textContent = editContent || '';
              }
              // Focus and move cursor to end
              requestAnimationFrame(() => {
                node.focus();
                const range = document.createRange();
                range.selectNodeContents(node);
                range.collapse(false);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
              });
            }
          }}
          style={style}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            const newContent = e.currentTarget.textContent || '';
            setEditContent(newContent);
          }}
        />
      );
    }

    const displayContent = content || (config.isHeading ? `Heading ${config.headingLevel}` : 'Text');
    return (
      <HeadingTag 
        style={style} 
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
      >
        {renderContentWithLineBreaks(displayContent)}
      </HeadingTag>
    );
  }

  if (isEditing && onContentChange) {
    return (
      <p
        ref={(node) => {
          if (node && editRef.current !== node) {
            editRef.current = node;
            // Set initial content if empty
            if (!node.textContent || node.textContent === '\u00A0') {
              node.textContent = editContent || '';
            }
            // Focus and move cursor to end
            requestAnimationFrame(() => {
              node.focus();
              const range = document.createRange();
              range.selectNodeContents(node);
              range.collapse(false);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            });
          }
        }}
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={(e) => {
          const newContent = e.currentTarget.textContent || '';
          setEditContent(newContent);
        }}
      />
    );
  }

  const displayContent = content || 'Text';
  return (
    <p 
      style={style} 
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      {renderContentWithLineBreaks(displayContent)}
    </p>
  );
});

TextElement.displayName = "TextElement";

export default TextElement;

