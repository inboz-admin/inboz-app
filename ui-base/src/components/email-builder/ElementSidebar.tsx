"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Type, 
  Image, 
  MousePointer, 
  Square, 
  Minus, 
  ArrowUpDown, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Search,
  GripVertical,
  List,
  Grid3x3
} from "lucide-react";
import type { ElementType, BuilderMode } from "./types";
import { ELEMENT_METADATA } from "./utils/elementTypes";
import { useDraggable } from "@dnd-kit/core";

interface ElementSidebarProps {
  mode: BuilderMode;
  onAddElement: (type: ElementType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const iconMap = {
  Type,
  Image,
  MousePointer,
  Square,
  Minus,
  ArrowUpDown,
  Share2,
  List,
  Grid: Grid3x3,
  Box: Square,
};

function DraggableElement({ 
  type, 
  mode, 
  onAddElement 
}: { 
  type: ElementType; 
  mode: BuilderMode;
  onAddElement: (type: ElementType) => void;
}) {
  const metadata = ELEMENT_METADATA[type];
  const Icon = iconMap[metadata.icon as keyof typeof iconMap] || Type;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-${type}`,
    data: { type },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  if (mode === 'drag-drop') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 p-3 border border-border rounded-lg bg-background hover:bg-muted cursor-move transition-colors"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{metadata.label}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onAddElement(type)}
      className="flex items-center gap-2 p-3 border border-border rounded-lg bg-background hover:bg-muted w-full text-left transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium flex-1">{metadata.label}</span>
    </button>
  );
}

export default function ElementSidebar({
  mode,
  onAddElement,
  isCollapsed = false,
  onToggleCollapse,
}: ElementSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const categories = [
    { name: 'content', label: 'Content' },
    { name: 'layout', label: 'Layout' },
    { name: 'media', label: 'Media' },
    { name: 'interactive', label: 'Interactive' },
  ];

  const filteredElements = Object.values(ELEMENT_METADATA).filter((meta) =>
    meta.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meta.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-muted/50 flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-muted/50 flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {categories.map((category) => {
            const categoryElements = filteredElements.filter(
              (meta) => meta.category === category.name
            );

            if (categoryElements.length === 0) return null;

            return (
              <div key={category.name}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">
                  {category.label}
                </h3>
                <div className="space-y-2">
                  {categoryElements.map((meta) => (
                    <DraggableElement
                      key={meta.type}
                      type={meta.type}
                      mode={mode}
                      onAddElement={onAddElement}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

