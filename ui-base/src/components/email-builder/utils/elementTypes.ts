import type { ElementType } from '../types';

// Element metadata type (without defaultConfig and defaultCssConfig)
type ElementMetadataPartial = {
  type: ElementType;
  label: string;
  icon: string;
  category: 'content' | 'layout' | 'media' | 'interactive';
  description: string;
};

// Default configurations for each element type
export const ELEMENT_DEFAULTS: Record<ElementType, { config: any; cssConfig: any }> = {
  text: {
    config: {
      content: 'Enter your text here',
      headingLevel: 1,
      isHeading: false,
      variables: [],
    },
    cssConfig: {
      color: '#000000',
      fontSize: '16px',
      fontWeight: '400',
      fontStyle: 'normal',
      lineHeight: '1.5',
      textAlign: 'left',
      padding: '0',
      margin: '0',
      fontFamily: 'Inter, sans-serif',
    },
  },
  image: {
    config: {
      src: '',
      alt: '',
      link: '',
      width: '100%',
      height: 'auto',
      alignment: 'center',
    },
    cssConfig: {
      padding: '0',
      margin: '0',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
    },
  },
  button: {
    config: {
      text: 'Click Here',
      link: '#',
      size: 'medium',
      style: 'primary',
      variables: [],
    },
    cssConfig: {
      backgroundColor: '#007bff',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '4px',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'inline-block',
      fontWeight: '600',
      borderWidth: '0',
      fontFamily: 'Inter, sans-serif',
    },
  },
  section: {
    config: {
      content: '',
      backgroundColor: '#ffffff',
      padding: '20px',
      alignment: 'center',
      maxWidth: '600px',
    },
    cssConfig: {
      backgroundColor: '#ffffff',
      padding: '20px',
      margin: '0 auto',
      maxWidth: '600px',
      fontFamily: 'Inter, sans-serif',
    },
  },
  divider: {
    config: {
      style: 'solid',
      color: '#e0e0e0',
      width: '100%',
      thickness: '1px',
    },
    cssConfig: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#e0e0e0',
      margin: '20px 0',
      padding: '0',
      fontFamily: 'Inter, sans-serif',
    },
  },
  spacer: {
    config: {
      height: '20px',
    },
    cssConfig: {
      height: '20px',
      padding: '0',
      margin: '0',
      fontFamily: 'Inter, sans-serif',
    },
  },
  social: {
    config: {
      platforms: [],
      iconStyle: 'filled',
      alignment: 'center',
      size: 'medium',
    },
    cssConfig: {
      padding: '0',
      margin: '0',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
    },
  },
  list: {
    config: {
      items: ['Item 1', 'Item 2', 'Item 3'],
      listType: 'unordered',
      alignment: 'left',
      variables: [],
    },
    cssConfig: {
      color: '#000000',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.5',
      textAlign: 'left',
      padding: '0',
      margin: '0',
      fontFamily: 'Inter, sans-serif',
    },
  },
  grid: {
    config: {
      columns: 2,
      items: [
        { content: 'Grid Item 1', image: '', link: '' },
        { content: 'Grid Item 2', image: '', link: '' },
      ],
      gap: '10px',
      alignment: 'center',
      variables: [],
    },
    cssConfig: {
      padding: '0',
      margin: '0',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
    },
  },
  container: {
    config: {
      layoutType: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: '0',
      children: [],
    },
    cssConfig: {
      padding: '0',
      margin: '0',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    },
  },
};

// Element metadata
export const ELEMENT_METADATA: Record<ElementType, ElementMetadataPartial> = {
  text: {
    type: 'text',
    label: 'Text',
    icon: 'Type',
    category: 'content',
    description: 'Add headings, paragraphs, and rich text content',
  },
  image: {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    category: 'media',
    description: 'Add images with optional links',
  },
  button: {
    type: 'button',
    label: 'Button',
    icon: 'MousePointer',
    category: 'interactive',
    description: 'Add call-to-action buttons',
  },
  section: {
    type: 'section',
    label: 'Section',
    icon: 'Square',
    category: 'layout',
    description: 'Container with background and padding',
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'layout',
    description: 'Horizontal line separator',
  },
  spacer: {
    type: 'spacer',
    label: 'Spacer',
    icon: 'ArrowUpDown',
    category: 'layout',
    description: 'Add vertical spacing',
  },
  social: {
    type: 'social',
    label: 'Social Links',
    icon: 'Share2',
    category: 'interactive',
    description: 'Add social media links',
  },
  list: {
    type: 'list',
    label: 'List',
    icon: 'List',
    category: 'content',
    description: 'Add ordered or unordered lists',
  },
  grid: {
    type: 'grid',
    label: 'Grid',
    icon: 'Grid',
    category: 'layout',
    description: 'Add grid layout with multiple items',
  },
  container: {
    type: 'container',
    label: 'Container',
    icon: 'Box',
    category: 'layout',
    description: 'Flexible container with flex or grid layout',
  },
};

// Get elements by category
export const getElementsByCategory = (category: string): ElementType[] => {
  return Object.values(ELEMENT_METADATA)
    .filter((meta) => meta.category === category)
    .map((meta) => meta.type);
};

// Get default config for element type
export const getDefaultConfig = (type: ElementType) => {
  return ELEMENT_DEFAULTS[type].config;
};

// Get default CSS config for element type
export const getDefaultCssConfig = (type: ElementType) => {
  return ELEMENT_DEFAULTS[type].cssConfig;
};

