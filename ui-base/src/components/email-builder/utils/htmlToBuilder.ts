import type { BuilderData, BuilderElement, ElementType } from '../types';
import { getDefaultConfig, getDefaultCssConfig } from './elementTypes';

// Parse inline styles to CSS config object
const parseInlineStyles = (styleString: string): Record<string, any> => {
  if (!styleString) return {};
  
  const styles: Record<string, any> = {};
  const declarations = styleString.split(';');
  
  declarations.forEach((declaration) => {
    const [property, value] = declaration.split(':').map((s) => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[camelProperty] = value;
    }
  });
  
  return styles;
};

// Extract text content from HTML
const extractTextContent = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Parse HTML element to builder element
const parseHtmlElement = (element: Element, order: number): BuilderElement | null => {
  const tagName = element.tagName.toLowerCase();
  const inlineStyles = element.getAttribute('style') || '';
  const cssConfig = parseInlineStyles(inlineStyles);

  // Text element (heading or paragraph)
  if (tagName.match(/^h[1-6]$/)) {
    const level = parseInt(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    const content = extractTextContent(element.innerHTML);
    
    return {
      id: `element-${Date.now()}-${order}`,
      type: 'text',
      config: {
        content,
        headingLevel: level,
        isHeading: true,
        variables: [],
      },
      cssConfig: {
        ...getDefaultCssConfig('text'),
        ...cssConfig,
      },
      order,
    };
  }

  if (tagName === 'p') {
    const content = extractTextContent(element.innerHTML);
    
    return {
      id: `element-${Date.now()}-${order}`,
      type: 'text',
      config: {
        content,
        isHeading: false,
        variables: [],
      },
      cssConfig: {
        ...getDefaultCssConfig('text'),
        ...cssConfig,
      },
      order,
    };
  }

  // Image element
  if (tagName === 'img') {
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || '';
    const parent = element.parentElement;
    const link = parent?.tagName === 'A' ? parent.getAttribute('href') || '' : '';
    
    return {
      id: `element-${Date.now()}-${order}`,
      type: 'image',
      config: {
        src,
        alt,
        link,
        width: '100%',
        height: 'auto',
        alignment: 'center',
      },
      cssConfig: {
        ...getDefaultCssConfig('image'),
        ...cssConfig,
      },
      order,
    };
  }

  // Button element (anchor with button-like styling)
  if (tagName === 'a') {
    const href = element.getAttribute('href') || '#';
    const text = extractTextContent(element.innerHTML);
    const hasButtonStyles = inlineStyles.includes('background') || 
                          inlineStyles.includes('padding') ||
                          element.classList.contains('button');
    
    if (hasButtonStyles || text.length < 100) {
      return {
        id: `element-${Date.now()}-${order}`,
        type: 'button',
        config: {
          text,
          link: href,
          size: 'medium',
          style: 'primary',
          variables: [],
        },
        cssConfig: {
          ...getDefaultCssConfig('button'),
          ...cssConfig,
        },
        order,
      };
    }
  }

  // Divider element
  if (tagName === 'hr') {
    const borderColor = cssConfig.borderColor || '#e0e0e0';
    const borderWidth = cssConfig.borderWidth || '1px';
    const borderStyle = cssConfig.borderStyle || 'solid';
    
    return {
      id: `element-${Date.now()}-${order}`,
      type: 'divider',
      config: {
        style: borderStyle as 'solid' | 'dashed' | 'dotted',
        color: borderColor,
        width: '100%',
        thickness: borderWidth,
      },
      cssConfig: {
        ...getDefaultCssConfig('divider'),
        ...cssConfig,
      },
      order,
    };
  }

  // Spacer element (empty div with height)
  if (tagName === 'div') {
    const hasHeight = cssConfig.height && cssConfig.height !== 'auto' && cssConfig.height !== '0';
    const isEmpty = !element.textContent?.trim() && element.children.length === 0;
    
    if (hasHeight && isEmpty) {
      return {
        id: `element-${Date.now()}-${order}`,
        type: 'spacer',
        config: {
          height: cssConfig.height || '20px',
        },
        cssConfig: {
          ...getDefaultCssConfig('spacer'),
          ...cssConfig,
        },
        order,
      };
    }

    // Section element (div with background or padding)
    if (cssConfig.backgroundColor || cssConfig.padding || cssConfig.maxWidth) {
      return {
        id: `element-${Date.now()}-${order}`,
        type: 'section',
        config: {
          backgroundColor: cssConfig.backgroundColor,
          padding: cssConfig.padding,
          alignment: 'center',
          maxWidth: cssConfig.maxWidth,
        },
        cssConfig: {
          ...getDefaultCssConfig('section'),
          ...cssConfig,
        },
        order,
      };
    }
  }

  return null;
};

// Convert HTML to builder data structure
export const htmlToBuilder = (html: string): BuilderData => {
  if (!html || html.trim() === '') {
    return {
      mode: 'builder',
      elements: [],
    };
  }

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract body content if it's a full document
  const body = doc.body || doc.documentElement;
  
  // Get all direct child elements
  const elements: BuilderElement[] = [];
  let order = 0;

  Array.from(body.children).forEach((child) => {
    const builderElement = parseHtmlElement(child, order);
    if (builderElement) {
      elements.push(builderElement);
      order++;
    }
  });

  // If no elements found, try parsing the HTML string directly
  if (elements.length === 0) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    Array.from(tempDiv.children).forEach((child) => {
      const builderElement = parseHtmlElement(child, order);
      if (builderElement) {
        elements.push(builderElement);
        order++;
      }
    });
  }

  return {
    mode: 'builder',
    elements,
  };
};

