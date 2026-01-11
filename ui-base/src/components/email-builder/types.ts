// Email Template Builder Types and Interfaces

export type ElementType = 'text' | 'image' | 'button' | 'section' | 'divider' | 'spacer' | 'social' | 'list' | 'grid' | 'container';

// Builder Mode - export as const object for runtime, and type alias for types
export const BuilderModeValues = {
  DRAG_DROP: 'drag-drop',
  VISUAL: 'visual',
} as const;

export type BuilderMode = 'drag-drop' | 'visual';

// CSS Configuration
export interface CSSConfig {
  // Colors
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  
  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  lineHeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: string;
  
  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  
  // Borders
  borderWidth?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: string;
  
  // Layout
  width?: string;
  maxWidth?: string;
  height?: string;
  display?: string;
  alignItems?: string;
  justifyContent?: string;
}

// Element-specific configurations
export interface TextConfig {
  content: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  isHeading?: boolean;
  variables?: string[];
}

export interface ImageConfig {
  src: string;
  alt?: string;
  link?: string;
  width?: string;
  height?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface ButtonConfig {
  text: string;
  link: string;
  size?: 'small' | 'medium' | 'large';
  style?: 'primary' | 'secondary' | 'outline';
  variables?: string[];
}

export interface SectionConfig {
  content?: string;
  backgroundColor?: string;
  padding?: string;
  alignment?: 'left' | 'center' | 'right';
  maxWidth?: string;
}

export interface DividerConfig {
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  width?: string;
  thickness?: string;
}

export interface SpacerConfig {
  height: string;
}

export interface SocialConfig {
  platforms: Array<{
    platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'github';
    url: string;
  }>;
  iconStyle?: 'filled' | 'outline' | 'rounded';
  alignment?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large';
}

export interface ListConfig {
  items: string[];
  listType?: 'ordered' | 'unordered';
  alignment?: 'left' | 'center' | 'right';
  variables?: string[];
}

export interface GridConfig {
  columns: number;
  items: Array<{
    content: string;
    image?: string;
    link?: string;
  }>;
  gap?: string;
  alignment?: 'left' | 'center' | 'right';
  variables?: string[];
}

export interface ContainerConfig {
  layoutType?: 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  flexWrap?: 'nowrap' | 'wrap';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap?: string;
  gridColumns?: number;
  gridRows?: number;
  children?: string[]; // Array of child element IDs
}

// Union type for all element configs
export type ElementConfig = 
  | TextConfig 
  | ImageConfig 
  | ButtonConfig 
  | SectionConfig 
  | DividerConfig 
  | SpacerConfig 
  | SocialConfig
  | ListConfig
  | GridConfig
  | ContainerConfig;

// Builder Element
export interface BuilderElement {
  id: string;
  type: ElementType;
  config: ElementConfig;
  cssConfig: CSSConfig;
  order: number;
  parentId?: string; // For nested elements in containers
}

// Builder Data Structure
export interface BuilderData {
  mode: 'builder' | 'editor';
  elements: BuilderElement[];
  globalStyles?: CSSConfig;
}

// Element Metadata
export interface ElementMetadata {
  type: ElementType;
  label: string;
  icon: string;
  category: 'content' | 'layout' | 'media' | 'interactive';
  description: string;
  defaultConfig: ElementConfig;
  defaultCssConfig: CSSConfig;
}

