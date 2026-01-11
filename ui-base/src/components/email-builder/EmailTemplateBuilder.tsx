"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BuilderData, BuilderElement, ElementType, BuilderMode } from "./types";
import { getDefaultConfig, getDefaultCssConfig } from "./utils/elementTypes";
import ElementSidebar from "./ElementSidebar";
import BuilderCanvas from "./BuilderCanvas";
import ElementConfigPanel from "./ElementConfigPanel";
import { builderToHtml } from "./utils/builderToHtml";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { GripVertical, MousePointer } from "lucide-react";

interface EmailTemplateBuilderProps {
  initialData?: BuilderData;
  onHtmlChange?: (html: string) => void;
  onDataChange?: (data: BuilderData) => void;
  previewData?: Record<string, string>;
  onSaveContent?: (html: string, data: BuilderData) => void;
}

export default function EmailTemplateBuilder({
  initialData,
  onHtmlChange,
  onDataChange,
  previewData,
  onSaveContent,
}: EmailTemplateBuilderProps) {
  const [elements, setElements] = useState<BuilderElement[]>(
    initialData?.elements || []
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>("drag-drop");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Store callbacks in refs to avoid dependency issues
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onDataChangeRef = useRef(onDataChange);
  
  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
    onDataChangeRef.current = onDataChange;
  }, [onHtmlChange, onDataChange]);

  // Update HTML when elements change
  useEffect(() => {
    const builderData: BuilderData = {
      mode: 'builder',
      elements,
      globalStyles: initialData?.globalStyles,
    };
    
    const html = builderToHtml(builderData);
    onHtmlChangeRef.current?.(html);
    onDataChangeRef.current?.(builderData);
  }, [elements, initialData?.globalStyles]);

  const addElement = useCallback((type: ElementType) => {
    const newElement: BuilderElement = {
      id: `element-${Date.now()}-${Math.random()}`,
      type,
      config: getDefaultConfig(type),
      cssConfig: getDefaultCssConfig(type),
      order: elements.length,
    };
    
    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  }, [elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<BuilderElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => {
      const filtered = prev.filter((el) => el.id !== id);
      // Reorder remaining elements
      return filtered.map((el, index) => ({ ...el, order: index }));
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [selectedElementId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    // Handle dropping element from sidebar
    if (active.id.toString().startsWith('draggable-')) {
      const elementType = active.data.current?.type as ElementType;
      if (elementType) {
        const overId = over.id.toString();
        if (overId === 'canvas-drop-zone') {
          // Drop on canvas
          addElement(elementType);
        } else if (overId.startsWith('container-')) {
          // Drop into container
          const containerId = overId.replace('container-', '');
          const container = elements.find((el) => el.id === containerId);
          if (container && container.type === 'container') {
            const newElement: BuilderElement = {
              id: `element-${Date.now()}-${Math.random()}`,
              type: elementType,
              config: getDefaultConfig(elementType),
              cssConfig: getDefaultCssConfig(elementType),
              order: 0,
              parentId: containerId,
            };
            
            setElements((prev) => {
              const containerConfig = container.config as any;
              const children = containerConfig.children || [];
              return [
                ...prev,
                newElement,
              ].map((el) => {
                if (el.id === containerId) {
                  return {
                    ...el,
                    config: {
                      ...el.config,
                      children: [...children, newElement.id],
                    },
                  };
                }
                return el;
              });
            });
            setSelectedElementId(newElement.id);
          }
        }
      }
      setActiveId(null);
      return;
    }

    // Handle reordering elements
    if (active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order property
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }

    setActiveId(null);
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full bg-background">
        {/* Element Sidebar */}
        <ElementSidebar
          mode={mode}
          onAddElement={addElement}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area - Full width with padding */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="p-2 border-b border-border flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2">
              <Toggle
                pressed={mode === 'drag-drop'}
                onPressedChange={(pressed) => setMode(pressed ? 'drag-drop' : 'visual')}
                size="sm"
                aria-label="Toggle drag-drop mode"
              >
                <GripVertical className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={mode === 'visual'}
                onPressedChange={(pressed) => setMode(pressed ? 'visual' : 'drag-drop')}
                size="sm"
                aria-label="Toggle visual editor mode"
              >
                <MousePointer className="h-4 w-4" />
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {elements.length} element{elements.length !== 1 ? 's' : ''}
              </div>
              {onSaveContent && elements.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const builderData: BuilderData = {
                      mode: 'builder',
                      elements,
                      globalStyles: initialData?.globalStyles,
                    };
                    const html = builderToHtml(builderData);
                    onSaveContent(html, builderData);
                  }}
                >
                  Save Content
                </Button>
              )}
            </div>
          </div>

          {/* Canvas - Full width with padding */}
          <div className="flex-1 overflow-auto p-4">
            <BuilderCanvas
              elements={elements}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onDeleteElement={deleteElement}
              onUpdateElement={(id, updates) => updateElement(id, updates)}
              previewData={previewData}
            />
          </div>
        </div>

        {/* Configuration Panel - 30% width */}
        <div style={{ width: '30%' }} className="border-l border-border">
          <ElementConfigPanel
            element={selectedElement}
            onUpdateElement={(updates) => {
              if (selectedElementId) {
                updateElement(selectedElementId, updates);
              }
            }}
          />
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-50 bg-muted p-2 rounded border border-border">
            Dragging...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

