"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BuilderElement, ElementType } from "./types";
import TextElement from "./elements/TextElement";
import ImageElement from "./elements/ImageElement";
import ButtonElement from "./elements/ButtonElement";
import SectionElement from "./elements/SectionElement";
import DividerElement from "./elements/DividerElement";
import SpacerElement from "./elements/SpacerElement";
import SocialElement from "./elements/SocialElement";
import ListElement from "./elements/ListElement";
import GridElement from "./elements/GridElement";
import ContainerElement from "./elements/ContainerElement";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, GripVertical } from "lucide-react";

interface BuilderCanvasProps {
  elements: BuilderElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<BuilderElement>) => void;
  previewData?: Record<string, string>;
}

// Non-sortable renderer for child elements inside containers
function NonSortableElementRenderer({ 
  element, 
  isSelected, 
  onSelect, 
  onDelete,
  onUpdateElement,
  previewData,
  elements = [],
  selectedElementId = null,
  onSelectElement,
  onDeleteElement,
}: { 
  element: BuilderElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateElement: (updates: Partial<BuilderElement>) => void;
  previewData?: Record<string, string>;
  elements?: BuilderElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onDeleteElement?: (id: string) => void;
}) {
  const renderElement = () => {
    switch (element.type) {
      case 'text':
        return (
          <TextElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            onContentChange={(content) => {
              onUpdateElement({
                config: { ...element.config, content } as any,
              });
            }}
            previewData={previewData}
          />
        );
      case 'image':
        return (
          <ImageElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            onResize={(width, height) => {
              onUpdateElement({
                config: { ...element.config, width, height } as any,
              });
            }}
          />
        );
      case 'button':
        return (
          <ButtonElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'section':
        return (
          <SectionElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'divider':
        return (
          <DividerElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'spacer':
        return (
          <SpacerElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'social':
        return (
          <SocialElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'list':
        return (
          <ListElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'grid':
        return (
          <GridElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'container':
        // Nested containers - get child elements
        const containerConfig = element.config as any;
        const allElements = elements || [];
        const childElements = (containerConfig.children || [])
          .map((childId: string) => allElements.find((e) => e.id === childId))
          .filter(Boolean) as BuilderElement[];
        
        return (
          <ContainerElement
            config={containerConfig}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            children={childElements}
            containerId={`container-${element.id}`}
            onRenderChild={(childElement) => (
              <NonSortableElementRenderer
                element={childElement}
                isSelected={selectedElementId === childElement.id}
                onSelect={() => {
                  if (onSelectElement) {
                    onSelectElement(childElement.id);
                  } else {
                    onSelect();
                  }
                }}
                onDelete={() => {
                  if (onDeleteElement) {
                    onDeleteElement(childElement.id);
                  }
                }}
                onUpdateElement={(updates) => onUpdateElement(childElement.id, updates)}
                previewData={previewData}
                elements={allElements}
                selectedElementId={selectedElementId}
                onSelectElement={onSelectElement}
                onDeleteElement={onDeleteElement}
              />
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative group">
      <div 
        className="relative cursor-pointer"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.delete-button')) {
            e.stopPropagation();
            onSelect();
          }
        }}
      >
        {renderElement()}
        {isSelected && (
          <div className="absolute -top-2 -right-2 z-10 delete-button">
            <Button
              variant="destructive"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ElementRenderer({ 
  element, 
  isSelected, 
  onSelect, 
  onDelete,
  onUpdateElement,
  previewData,
  elements = [],
  selectedElementId = null,
  onSelectElement,
  onDeleteElement,
}: { 
  element: BuilderElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateElement: (updates: Partial<BuilderElement>) => void;
  previewData?: Record<string, string>;
  elements?: BuilderElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onDeleteElement?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderElement = () => {
    switch (element.type) {
      case 'text':
        return (
          <TextElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            onContentChange={(content) => {
              onUpdateElement({
                config: { ...element.config, content } as any,
              });
            }}
            previewData={previewData}
          />
        );
      case 'image':
        return (
          <ImageElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            onResize={(width, height) => {
              onUpdateElement({
                config: { ...element.config, width, height } as any,
              });
            }}
          />
        );
      case 'button':
        return (
          <ButtonElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'section':
        return (
          <SectionElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'divider':
        return (
          <DividerElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'spacer':
        return (
          <SpacerElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'social':
        return (
          <SocialElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
          />
        );
      case 'list':
        return (
          <ListElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'grid':
        return (
          <GridElement
            config={element.config as any}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            previewData={previewData}
          />
        );
      case 'container':
        // Get child elements for this container
        const containerConfig = element.config as any;
        const allElements = elements || [];
        const childElements = (containerConfig.children || [])
          .map((childId: string) => allElements.find((e) => e.id === childId))
          .filter(Boolean) as BuilderElement[];
        
        return (
          <ContainerElement
            config={containerConfig}
            cssConfig={element.cssConfig}
            isSelected={isSelected}
            onClick={onSelect}
            children={childElements}
            containerId={`container-${element.id}`}
            onRenderChild={(childElement) => (
              <NonSortableElementRenderer
                element={childElement}
                isSelected={selectedElementId === childElement.id}
                onSelect={() => {
                  if (onSelectElement) {
                    onSelectElement(childElement.id);
                  } else {
                    onSelect();
                  }
                }}
                onDelete={() => {
                  if (onDeleteElement) {
                    onDeleteElement(childElement.id);
                  }
                }}
                onUpdateElement={(updates) => onUpdateElement(childElement.id, updates)}
                previewData={previewData}
                elements={allElements}
                selectedElementId={selectedElementId}
                onSelectElement={onSelectElement}
                onDeleteElement={onDeleteElement}
              />
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      {...attributes}
    >
      <div 
        className="relative cursor-pointer"
        onClick={(e) => {
          // Only select if not clicking on drag handle or delete button
          if (!(e.target as HTMLElement).closest('.drag-handle, .delete-button')) {
            e.stopPropagation();
            onSelect();
          }
        }}
      >
        {renderElement()}
        {isSelected && (
          <div className="absolute -top-2 -right-2 z-10 delete-button">
            <Button
              variant="destructive"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div
          {...listeners}
          className="drag-handle absolute -bottom-2 -right-2 w-6 h-6 cursor-move opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded flex items-center justify-center z-10"
          style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function BuilderCanvas({
  elements,
  selectedElementId,
  onSelectElement,
  onDeleteElement,
  onUpdateElement,
  previewData,
}: BuilderCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  // Filter out nested elements (they're rendered inside containers)
  const topLevelElements = elements.filter((el) => !el.parentId);
  const sortedElements = [...topLevelElements].sort((a, b) => a.order - b.order);
  const elementIds = sortedElements.map((el) => el.id);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="px-4 py-2 flex-shrink-0">
        <h3 className="text-sm font-semibold">Email Preview</h3>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={setNodeRef}
          className={`transition-colors ${
            isOver ? 'bg-muted/50' : 'bg-background'
          }`}
          onClick={() => onSelectElement(null)}
        >
          <div className="w-full bg-white border border-border rounded-lg shadow-sm p-6">
            {sortedElements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Drag elements here or click to add</p>
              </div>
            ) : (
              <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0">
                  {sortedElements.map((element) => (
                    <ElementRenderer
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      onSelect={() => onSelectElement(element.id)}
                      onDelete={() => onDeleteElement(element.id)}
                      onUpdateElement={(updates) => onUpdateElement(element.id, updates)}
                      previewData={previewData}
                      elements={elements}
                      selectedElementId={selectedElementId}
                      onSelectElement={onSelectElement}
                      onDeleteElement={onDeleteElement}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

