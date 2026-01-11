"use client";

import { useState } from "react";
import type { BuilderElement, ElementType } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VariablePicker } from "@/pages/email-templates/VariablePicker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ElementConfigPanelProps {
  element: BuilderElement | null;
  onUpdateElement: (updates: Partial<BuilderElement>) => void;
  availableVariables?: string[];
}

const DEFAULT_VARIABLES = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
  'company',
  'companyDomain',
  'companyWebsite',
  'companyIndustry',
  'companySize',
];

export default function ElementConfigPanel({
  element,
  onUpdateElement,
  availableVariables = DEFAULT_VARIABLES,
}: ElementConfigPanelProps) {
  if (!element) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground">No element selected</p>
          <p className="text-xs text-muted-foreground mt-2">
            Click on an element in the preview to configure it
          </p>
        </div>
      </div>
    );
  }

  const updateConfig = (updates: any) => {
    onUpdateElement({
      config: { ...element.config, ...updates },
    });
  };

  const updateCssConfig = (updates: any) => {
    onUpdateElement({
      cssConfig: { ...element.cssConfig, ...updates },
    });
  };

  const handleVariableInsert = (variable: string, field: 'content' | 'text') => {
    const currentValue = (element.config as any)[field] || '';
    const newValue = currentValue + `{{${variable}}}`;
    updateConfig({ [field]: newValue });
  };

  return (
    <div className="w-full h-full flex flex-col border-l border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Element Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1 capitalize">{element.type}</p>
      </div>

      <Tabs defaultValue="element" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="element" className="flex-1">Element</TabsTrigger>
          <TabsTrigger value="css" className="flex-1">CSS</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="element" className="p-4 space-y-4 mt-0">
            {element.type === 'text' && (
              <>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={(element.config as any).content || ''}
                      onChange={(e) => updateConfig({ content: e.target.value })}
                      placeholder="Enter text content"
                      rows={4}
                      className="flex-1"
                    />
                    <VariablePicker
                      variables={availableVariables}
                      onInsert={(v) => handleVariableInsert(v, 'content')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={(element.config as any).isHeading ? 'heading' : 'paragraph'}
                    onValueChange={(value) => {
                      if (value === 'heading') {
                        updateConfig({ isHeading: true, headingLevel: 1 });
                      } else {
                        updateConfig({ isHeading: false });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="heading">Heading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(element.config as any).isHeading && (
                  <div className="space-y-2">
                    <Label>Heading Level</Label>
                    <Select
                      value={String((element.config as any).headingLevel || 1)}
                      onValueChange={(value) => updateConfig({ headingLevel: parseInt(value) as any })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <SelectItem key={level} value={String(level)}>
                            H{level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {element.type === 'image' && (
              <>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    value={(element.config as any).src || ''}
                    onChange={(e) => updateConfig({ src: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alt Text</Label>
                  <Input
                    value={(element.config as any).alt || ''}
                    onChange={(e) => updateConfig({ alt: e.target.value })}
                    placeholder="Image description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={(element.config as any).link || ''}
                    onChange={(e) => updateConfig({ link: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Input
                      value={(element.config as any).width || '100%'}
                      onChange={(e) => updateConfig({ width: e.target.value })}
                      placeholder="100%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input
                      value={(element.config as any).height || ''}
                      onChange={(e) => updateConfig({ height: e.target.value })}
                      placeholder="auto"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <Select
                    value={(element.config as any).alignment || 'center'}
                    onValueChange={(value) => updateConfig({ alignment: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {element.type === 'button' && (
              <>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <div className="flex gap-2">
                    <Input
                      value={(element.config as any).text || ''}
                      onChange={(e) => updateConfig({ text: e.target.value })}
                      placeholder="Click Here"
                    />
                    <VariablePicker
                      variables={availableVariables}
                      onInsert={(v) => handleVariableInsert(v, 'text')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input
                    value={(element.config as any).link || ''}
                    onChange={(e) => updateConfig({ link: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select
                      value={(element.config as any).size || 'medium'}
                      onValueChange={(value) => updateConfig({ size: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select
                      value={(element.config as any).style || 'primary'}
                      onValueChange={(value) => updateConfig({ style: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {element.type === 'section' && (
              <>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={(element.config as any).content || ''}
                    onChange={(e) => updateConfig({ content: e.target.value })}
                    placeholder="Enter section content (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Input
                      value={(element.cssConfig as any).width || '100%'}
                      onChange={(e) => updateCssConfig({ width: e.target.value })}
                      placeholder="100%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Width</Label>
                    <Input
                      value={(element.config as any).maxWidth || (element.cssConfig as any).maxWidth || '600px'}
                      onChange={(e) => {
                        updateConfig({ maxWidth: e.target.value });
                        updateCssConfig({ maxWidth: e.target.value });
                      }}
                      placeholder="600px"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Padding</Label>
                  <Input
                    value={(element.config as any).padding || '20px'}
                    onChange={(e) => updateConfig({ padding: e.target.value })}
                    placeholder="20px"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <Select
                    value={(element.config as any).alignment || 'center'}
                    onValueChange={(value) => updateConfig({ alignment: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {element.type === 'divider' && (
              <>
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={(element.config as any).style || 'solid'}
                    onValueChange={(value) => updateConfig({ style: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={(element.config as any).color || '#e0e0e0'}
                    onChange={(e) => updateConfig({ color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thickness</Label>
                  <Input
                    value={(element.config as any).thickness || '1px'}
                    onChange={(e) => updateConfig({ thickness: e.target.value })}
                    placeholder="1px"
                  />
                </div>
              </>
            )}

            {element.type === 'spacer' && (
              <div className="space-y-2">
                <Label>Height</Label>
                <Input
                  value={(element.config as any).height || '20px'}
                  onChange={(e) => updateConfig({ height: e.target.value })}
                  placeholder="20px"
                />
              </div>
            )}

            {element.type === 'social' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Social Links ({((element.config as any).platforms || []).length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentPlatforms = (element.config as any).platforms || [];
                        updateConfig({
                          platforms: [...currentPlatforms, { platform: 'facebook', url: '' }]
                        });
                      }}
                    >
                      Add Link
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {((element.config as any).platforms || []).map((platform: any, index: number) => (
                      <div key={index} className="p-2 border border-border rounded space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Platform</Label>
                          <Select
                            value={platform.platform || 'facebook'}
                            onValueChange={(value) => {
                              const platforms = [...((element.config as any).platforms || [])];
                              platforms[index] = { ...platforms[index], platform: value };
                              updateConfig({ platforms });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="twitter">Twitter</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="github">GitHub</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">URL</Label>
                          <Input
                            value={platform.url || ''}
                            onChange={(e) => {
                              const platforms = [...((element.config as any).platforms || [])];
                              platforms[index] = { ...platforms[index], url: e.target.value };
                              updateConfig({ platforms });
                            }}
                            placeholder="https://example.com"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const platforms = [...((element.config as any).platforms || [])];
                            platforms.splice(index, 1);
                            updateConfig({ platforms });
                          }}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Icon Style</Label>
                    <Select
                      value={(element.config as any).iconStyle || 'filled'}
                      onValueChange={(value) => updateConfig({ iconStyle: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filled">Filled</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select
                      value={(element.config as any).size || 'medium'}
                      onValueChange={(value) => updateConfig({ size: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <Select
                    value={(element.config as any).alignment || 'center'}
                    onValueChange={(value) => updateConfig({ alignment: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {element.type === 'list' && (
              <>
                <div className="space-y-2">
                  <Label>List Type</Label>
                  <Select
                    value={(element.config as any).listType || 'unordered'}
                    onValueChange={(value) => updateConfig({ listType: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unordered">Unordered (Bullets)</SelectItem>
                      <SelectItem value="ordered">Ordered (Numbers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>List Items ({(element.config as any).items?.length || 0})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentItems = (element.config as any).items || [];
                        updateConfig({
                          items: [...currentItems, 'New Item']
                        });
                      }}
                    >
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {((element.config as any).items || []).map((item: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => {
                            const items = [...((element.config as any).items || [])];
                            items[index] = e.target.value;
                            updateConfig({ items });
                          }}
                          placeholder={`Item ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const items = [...((element.config as any).items || [])];
                            items.splice(index, 1);
                            updateConfig({ items });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {element.type === 'container' && (
              <>
                <div className="space-y-2">
                  <Label>Layout Type</Label>
                  <Select
                    value={(element.config as any).layoutType || 'flex'}
                    onValueChange={(value) => updateConfig({ layoutType: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex">Flex</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(element.config as any).layoutType === 'flex' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Direction</Label>
                        <Select
                          value={(element.config as any).flexDirection || 'row'}
                          onValueChange={(value) => updateConfig({ flexDirection: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="row">Row</SelectItem>
                            <SelectItem value="column">Column</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Wrap</Label>
                        <Select
                          value={(element.config as any).flexWrap || 'nowrap'}
                          onValueChange={(value) => updateConfig({ flexWrap: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nowrap">No Wrap</SelectItem>
                            <SelectItem value="wrap">Wrap</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Justify Content</Label>
                        <Select
                          value={(element.config as any).justifyContent || 'flex-start'}
                          onValueChange={(value) => updateConfig({ justifyContent: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flex-start">Flex Start</SelectItem>
                            <SelectItem value="flex-end">Flex End</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="space-between">Space Between</SelectItem>
                            <SelectItem value="space-around">Space Around</SelectItem>
                            <SelectItem value="space-evenly">Space Evenly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Align Items</Label>
                        <Select
                          value={(element.config as any).alignItems || 'stretch'}
                          onValueChange={(value) => updateConfig({ alignItems: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flex-start">Flex Start</SelectItem>
                            <SelectItem value="flex-end">Flex End</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="stretch">Stretch</SelectItem>
                            <SelectItem value="baseline">Baseline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Columns</Label>
                        <Input
                          type="number"
                          value={(element.config as any).gridColumns || 2}
                          onChange={(e) => updateConfig({ gridColumns: parseInt(e.target.value) || 2 })}
                          min="1"
                          max="12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rows</Label>
                        <Input
                          type="number"
                          value={(element.config as any).gridRows || ''}
                          onChange={(e) => updateConfig({ gridRows: e.target.value ? parseInt(e.target.value) : undefined })}
                          min="1"
                          placeholder="Auto"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Gap</Label>
                  <Input
                    value={(element.config as any).gap || '10px'}
                    onChange={(e) => updateConfig({ gap: e.target.value })}
                    placeholder="10px"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Drop elements into this container to add them as children
                  </Label>
                </div>
              </>
            )}

            {element.type === 'grid' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Columns</Label>
                    <Select
                      value={String((element.config as any).columns || 2)}
                      onValueChange={(value) => {
                        const newColumns = parseInt(value);
                        const currentItems = (element.config as any).items || [];
                        const currentColumns = (element.config as any).columns || 2;
                        
                        // Adjust items based on column change
                        let newItems = [...currentItems];
                        if (newColumns > currentColumns) {
                          // Add items if columns increased
                          const itemsToAdd = newColumns - currentColumns;
                          for (let i = 0; i < itemsToAdd; i++) {
                            newItems.push({ content: 'New Item', image: '', link: '' });
                          }
                        } else if (newColumns < currentColumns) {
                          // Remove items if columns decreased
                          newItems = newItems.slice(0, newColumns);
                        }
                        
                        updateConfig({ columns: newColumns, items: newItems });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Column</SelectItem>
                        <SelectItem value="2">2 Columns</SelectItem>
                        <SelectItem value="3">3 Columns</SelectItem>
                        <SelectItem value="4">4 Columns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gap</Label>
                    <Input
                      value={(element.config as any).gap || '10px'}
                      onChange={(e) => updateConfig({ gap: e.target.value })}
                      placeholder="10px"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <Select
                    value={(element.config as any).alignment || 'center'}
                    onValueChange={(value) => updateConfig({ alignment: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Grid Items ({((element.config as any).items || []).length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentItems = (element.config as any).items || [];
                        updateConfig({
                          items: [...currentItems, { content: 'New Item', image: '', link: '' }]
                        });
                      }}
                    >
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {((element.config as any).items || []).map((item: any, index: number) => (
                      <div key={index} className="p-2 border border-border rounded space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Content</Label>
                          <Input
                            value={item.content || ''}
                            onChange={(e) => {
                              const items = [...((element.config as any).items || [])];
                              items[index] = { ...items[index], content: e.target.value };
                              updateConfig({ items });
                            }}
                            placeholder="Item content"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Image URL (optional)</Label>
                          <Input
                            value={item.image || ''}
                            onChange={(e) => {
                              const items = [...((element.config as any).items || [])];
                              items[index] = { ...items[index], image: e.target.value };
                              updateConfig({ items });
                            }}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Link URL (optional)</Label>
                          <Input
                            value={item.link || ''}
                            onChange={(e) => {
                              const items = [...((element.config as any).items || [])];
                              items[index] = { ...items[index], link: e.target.value };
                              updateConfig({ items });
                            }}
                            placeholder="https://example.com"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const items = [...((element.config as any).items || [])];
                            items.splice(index, 1);
                            updateConfig({ items });
                          }}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="css" className="p-4 space-y-4 mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Colors</h4>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Background</Label>
                    <Input
                      type="color"
                      value={element.cssConfig.backgroundColor || '#ffffff'}
                      onChange={(e) => updateCssConfig({ backgroundColor: e.target.value })}
                      className="h-9 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Text</Label>
                    <Input
                      type="color"
                      value={element.cssConfig.color || '#000000'}
                      onChange={(e) => updateCssConfig({ color: e.target.value })}
                      className="h-9 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Border</Label>
                    <Input
                      type="color"
                      value={element.cssConfig.borderColor || '#e0e0e0'}
                      onChange={(e) => updateCssConfig({ borderColor: e.target.value })}
                      className="h-9 w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Typography</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={element.cssConfig.fontFamily || 'Inter, sans-serif'}
                      onValueChange={(value) => updateCssConfig({ fontFamily: value })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                        <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                        <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                        <SelectItem value="Tahoma, sans-serif">Tahoma</SelectItem>
                        <SelectItem value="Trebuchet MS, sans-serif">Trebuchet MS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Font Size</Label>
                      <Input
                        value={element.cssConfig.fontSize || ''}
                        onChange={(e) => updateCssConfig({ fontSize: e.target.value })}
                        placeholder="16px"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Font Weight</Label>
                      <Select
                        value={String(element.cssConfig.fontWeight || '400')}
                        onValueChange={(value) => updateCssConfig({ fontWeight: value })}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">Thin (100)</SelectItem>
                          <SelectItem value="200">Extra Light (200)</SelectItem>
                          <SelectItem value="300">Light (300)</SelectItem>
                          <SelectItem value="400">Normal (400)</SelectItem>
                          <SelectItem value="500">Medium (500)</SelectItem>
                          <SelectItem value="600">Semi-bold (600)</SelectItem>
                          <SelectItem value="700">Bold (700)</SelectItem>
                          <SelectItem value="800">Extra Bold (800)</SelectItem>
                          <SelectItem value="900">Black (900)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Font Style</Label>
                      <Select
                        value={element.cssConfig.fontStyle || 'normal'}
                        onValueChange={(value) => updateCssConfig({ fontStyle: value as any })}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="italic">Italic</SelectItem>
                          <SelectItem value="oblique">Oblique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Line Height</Label>
                      <Input
                        value={String(element.cssConfig.lineHeight || '1.5')}
                        onChange={(e) => updateCssConfig({ lineHeight: e.target.value })}
                        placeholder="1.5"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Text Align</Label>
                      <Select
                        value={element.cssConfig.textAlign || 'left'}
                        onValueChange={(value) => updateCssConfig({ textAlign: value as any })}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="justify">Justify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Spacing</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Padding</Label>
                    <Input
                      value={element.cssConfig.padding || ''}
                      onChange={(e) => updateCssConfig({ padding: e.target.value })}
                      placeholder="10px"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Margin</Label>
                    <Input
                      value={element.cssConfig.margin || ''}
                      onChange={(e) => updateCssConfig({ margin: e.target.value })}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Borders</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Border Width</Label>
                    <Input
                      value={element.cssConfig.borderWidth || ''}
                      onChange={(e) => updateCssConfig({ borderWidth: e.target.value })}
                      placeholder="1px"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Border Style</Label>
                    <Select
                      value={element.cssConfig.borderStyle || 'solid'}
                      onValueChange={(value) => updateCssConfig({ borderStyle: value as any })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Border Radius</Label>
                    <Input
                      value={element.cssConfig.borderRadius || ''}
                      onChange={(e) => updateCssConfig({ borderRadius: e.target.value })}
                      placeholder="4px"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

