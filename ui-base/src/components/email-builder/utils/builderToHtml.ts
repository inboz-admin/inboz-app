import type { BuilderData, BuilderElement, ElementType } from '../types';

// Escape HTML and convert newlines to <br> tags
const escapeHtmlAndConvertLineBreaks = (text: string): string => {
  if (!text) return '';
  // Escape HTML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  // Convert newlines to <br> tags
  return escaped.replace(/\n/g, '<br>');
};

// Convert CSS config to inline styles string
const cssConfigToInlineStyles = (cssConfig: Record<string, any>): string => {
  const styles: string[] = [];
  
  // Check if individual padding/margin properties are set
  const hasIndividualPadding = cssConfig.paddingTop || cssConfig.paddingRight || cssConfig.paddingBottom || cssConfig.paddingLeft;
  const hasIndividualMargin = cssConfig.marginTop || cssConfig.marginRight || cssConfig.marginBottom || cssConfig.marginLeft;
  
  Object.entries(cssConfig).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Skip shorthand padding if individual padding properties are set
      if (key === 'padding' && hasIndividualPadding) {
        return;
      }
      // Skip shorthand margin if individual margin properties are set
      if (key === 'margin' && hasIndividualMargin) {
        return;
      }
      
      // Convert camelCase to kebab-case
      const cssProperty = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      styles.push(`${cssProperty}: ${value}`);
    }
  });
  
  return styles.join('; ');
};

// Convert element to HTML (with support for nested elements)
const elementToHtml = (element: BuilderElement, allElements: BuilderElement[] = []): string => {
  const { type, config, cssConfig } = element;
  const styles = cssConfigToInlineStyles(cssConfig);
  const styleAttr = styles ? ` style="${styles}"` : '';

  switch (type) {
    case 'text': {
      const textConfig = config as any;
      const content = textConfig.content || '';
      // Convert newlines to <br> tags and escape HTML
      const processedContent = escapeHtmlAndConvertLineBreaks(content);
      
      // Build email-compatible styles - explicitly set padding/margin to 0
      const emailStylesObj: Record<string, any> = {
        ...cssConfig,
        margin: '0',
        marginTop: cssConfig.marginTop || '0',
        marginBottom: cssConfig.marginBottom || '0',
        marginLeft: cssConfig.marginLeft || '0',
        marginRight: cssConfig.marginRight || '0',
        paddingTop: cssConfig.paddingTop || '0',
        paddingBottom: cssConfig.paddingBottom || '0',
        paddingLeft: cssConfig.paddingLeft || '0',
        paddingRight: cssConfig.paddingRight || '0',
      };
      
      // Only set padding shorthand if no individual padding properties are set
      if (!cssConfig.paddingTop && !cssConfig.paddingRight && !cssConfig.paddingBottom && !cssConfig.paddingLeft) {
        emailStylesObj.padding = cssConfig.padding || '0';
      }
      
      const emailStyles = cssConfigToInlineStyles(emailStylesObj);
      const emailStyleAttr = emailStyles ? ` style="${emailStyles}"` : '';
      
      if (textConfig.isHeading && textConfig.headingLevel) {
        return `<h${textConfig.headingLevel}${emailStyleAttr}>${processedContent}</h${textConfig.headingLevel}>`;
      }
      return `<p${emailStyleAttr}>${processedContent}</p>`;
    }

    case 'image': {
      const imageConfig = config as any;
      const imgTag = `<img src="${imageConfig.src || ''}" alt="${imageConfig.alt || ''}" style="max-width: 100%; height: auto; ${styles}" />`;
      
      if (imageConfig.link) {
        return `<a href="${imageConfig.link}"${styleAttr}>${imgTag}</a>`;
      }
      return `<div${styleAttr}>${imgTag}</div>`;
    }

    case 'button': {
      const buttonConfig = config as any;
      const buttonStyles = cssConfigToInlineStyles({
        ...cssConfig,
        display: 'inline-block',
        textDecoration: 'none',
      });
      
      return `<a href="${buttonConfig.link || '#'}" style="${buttonStyles}"${styleAttr}>${buttonConfig.text || 'Button'}</a>`;
    }

    case 'section': {
      const sectionConfig = config as any;
      const sectionStyles = cssConfigToInlineStyles({
        ...cssConfig,
        backgroundColor: sectionConfig.backgroundColor || cssConfig.backgroundColor,
        padding: sectionConfig.padding || cssConfig.padding,
        maxWidth: sectionConfig.maxWidth || cssConfig.maxWidth,
      });
      
      const content = sectionConfig.content || '';
      return `<div style="${sectionStyles}"${styleAttr}>${content}</div>`;
    }

    case 'divider': {
      const dividerConfig = config as any;
      const dividerStyles = cssConfigToInlineStyles({
        ...cssConfig,
        borderWidth: dividerConfig.thickness || cssConfig.borderWidth || '1px',
        borderStyle: dividerConfig.style || cssConfig.borderStyle || 'solid',
        borderColor: dividerConfig.color || cssConfig.borderColor || '#e0e0e0',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
      });
      
      return `<hr style="${dividerStyles}" />`;
    }

    case 'spacer': {
      const spacerConfig = config as any;
      const spacerStyles = cssConfigToInlineStyles({
        ...cssConfig,
        height: spacerConfig.height || cssConfig.height || '20px',
      });
      
      return `<div style="${spacerStyles}"></div>`;
    }

    case 'social': {
      const socialConfig = config as any;
      const platforms = socialConfig.platforms || [];
      
      const socialStyles = cssConfigToInlineStyles({
        ...cssConfig,
        textAlign: socialConfig.alignment || cssConfig.textAlign || 'center',
      });
      const socialStyleAttr = socialStyles ? ` style="${socialStyles}"` : '';
      
      if (platforms.length === 0) {
        return `<div${socialStyleAttr}></div>`;
      }
      
      const links = platforms.map((platform: any) => {
        const iconName = platform.platform;
        return `<a href="${platform.url}" style="margin: 0 8px; text-decoration: none;">${iconName}</a>`;
      }).join('');
      
      return `<div${socialStyleAttr}>${links}</div>`;
    }

    case 'list': {
      const listConfig = config as any;
      const items = listConfig.items || [];
      const listTag = listConfig.listType === 'ordered' ? 'ol' : 'ul';
      
      // Ensure email-compatible styles (no default margins/padding on list)
      // Override padding first, then set individual padding properties
      const emailStyles = cssConfigToInlineStyles({
        margin: '0',
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0',
        marginRight: '0',
        padding: '0',
        paddingLeft: cssConfig.paddingLeft || '0',
        paddingRight: cssConfig.paddingRight || '0',
        paddingTop: cssConfig.paddingTop || '0',
        paddingBottom: cssConfig.paddingBottom || '0',
        color: cssConfig.color,
        fontSize: cssConfig.fontSize,
        fontWeight: cssConfig.fontWeight,
        lineHeight: cssConfig.lineHeight || '1',
        textAlign: cssConfig.textAlign,
        fontFamily: cssConfig.fontFamily,
        backgroundColor: cssConfig.backgroundColor,
        borderColor: cssConfig.borderColor,
        borderRadius: cssConfig.borderRadius,
        borderWidth: cssConfig.borderWidth,
        borderStyle: cssConfig.borderStyle,
        listStyleType: listConfig.listType === 'ordered' ? 'decimal' : 'disc',
        listStylePosition: 'inside',
      });
      const emailStyleAttr = emailStyles ? ` style="${emailStyles}"` : '';
      
      // List items should also have no default margin/padding
      const listItemStyle = 'style="margin: 0; padding: 0; list-style-position: inside;"';
      const listItems = items.map((item: string) => `<li ${listItemStyle}>${item}</li>`).join('');
      
      return `<${listTag}${emailStyleAttr}>${listItems}</${listTag}>`;
    }

    case 'grid': {
      const gridConfig = config as any;
      const items = gridConfig.items || [];
      const columns = gridConfig.columns || 2;
      const gap = gridConfig.gap || '10px';
      
      const gridStyles = cssConfigToInlineStyles({
        ...cssConfig,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gap,
      });
      
      const gridItems = items.map((item: any) => {
        const itemContent = item.image 
          ? `<img src="${item.image}" alt="${item.content}" style="max-width: 100%; height: auto; margin-bottom: 8px;" />${item.content || ''}`
          : item.content || '';
        
        const itemHtml = item.link 
          ? `<a href="${item.link}" style="text-decoration: none; color: inherit;">${itemContent}</a>`
          : itemContent;
        
        return `<div style="padding: 10px;">${itemHtml}</div>`;
      }).join('');
      
      return `<div style="${gridStyles}"${styleAttr}>${gridItems}</div>`;
    }

    case 'container': {
      const containerConfig = config as any;
      const childIds = containerConfig.children || [];
      const childElements = allElements.filter((e) => childIds.includes(e.id));
      const sortedChildren = [...childElements].sort((a, b) => a.order - b.order);
      
      // Build container styles
      const containerStyles: Record<string, any> = { ...cssConfig };
      
      if (containerConfig.layoutType === 'flex') {
        containerStyles.display = 'flex';
        containerStyles.flexDirection = containerConfig.flexDirection || 'row';
        containerStyles.flexWrap = containerConfig.flexWrap || 'nowrap';
        containerStyles.justifyContent = containerConfig.justifyContent || 'flex-start';
        containerStyles.alignItems = containerConfig.alignItems || 'stretch';
        containerStyles.gap = containerConfig.gap || '10px';
      } else if (containerConfig.layoutType === 'grid') {
        containerStyles.display = 'grid';
        containerStyles.gridTemplateColumns = containerConfig.gridColumns 
          ? `repeat(${containerConfig.gridColumns}, 1fr)`
          : 'repeat(2, 1fr)';
        if (containerConfig.gridRows) {
          containerStyles.gridTemplateRows = `repeat(${containerConfig.gridRows}, 1fr)`;
        }
        containerStyles.gap = containerConfig.gap || '10px';
        containerStyles.justifyItems = containerConfig.justifyContent === 'center' ? 'center' 
          : containerConfig.justifyContent === 'flex-end' ? 'end' 
          : 'start';
        containerStyles.alignItems = containerConfig.alignItems || 'stretch';
      }
      
      const containerStylesStr = cssConfigToInlineStyles(containerStyles);
      const childrenHtml = sortedChildren
        .map((child) => elementToHtml(child, allElements))
        .join('');
      
      return `<div style="${containerStylesStr}"${styleAttr}>${childrenHtml}</div>`;
    }

    default:
      return '';
  }
};

// Convert builder data to email-compatible HTML
export const builderToHtml = (builderData: BuilderData): string => {
  if (!builderData || !builderData.elements || builderData.elements.length === 0) {
    return '';
  }

  // Filter out nested elements (they're rendered inside containers)
  const topLevelElements = builderData.elements.filter((el) => !el.parentId);
  const sortedElements = [...topLevelElements].sort((a, b) => a.order - b.order);

  // Convert each element to HTML (pass all elements for nested rendering)
  // Join without newlines to avoid spacing issues in email clients
  const elementsHtml = sortedElements.map((el) => elementToHtml(el, builderData.elements)).join('');

  // Wrap in email-compatible table structure
  const globalStyles = builderData.globalStyles || {};
  const bodyStyles = cssConfigToInlineStyles(globalStyles);

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 10px; border-collapse: collapse; ${bodyStyles}"><tr><td style="padding: 0; margin: 0;">${elementsHtml}</td></tr></table>`;
};

// Convert builder data to plain HTML (without table wrapper)
export const builderToPlainHtml = (builderData: BuilderData): string => {
  if (!builderData || !builderData.elements || builderData.elements.length === 0) {
    return '';
  }

  const topLevelElements = builderData.elements.filter((el) => !el.parentId);
  const sortedElements = [...topLevelElements].sort((a, b) => a.order - b.order);
  return sortedElements.map((el) => elementToHtml(el, builderData.elements)).join('\n');
};

