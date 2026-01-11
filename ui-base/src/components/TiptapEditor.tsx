"use client";

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
// These extensions are already included in StarterKit, so we don't need to import them separately
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { VariablePicker } from '@/pages/email-templates/VariablePicker';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  Type,
  Link as LinkIcon
} from 'lucide-react';

interface TiptapEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TiptapEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Write your email content here...',
  disabled = false 
}: TiptapEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState<string>('');
  const isUserEditingRef = useRef(false);
  const lastUserContentRef = useRef<string>('');
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 pl-4 italic',
          },
        },
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      ListItem,
      TextStyle,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      lastUserContentRef.current = htmlContent;
      isUserEditingRef.current = true;
      onChange?.(htmlContent);
      // Reset flag after a short delay
      setTimeout(() => {
        isUserEditingRef.current = false;
      }, 100);
    },
    editable: !disabled,
  });

  // Update editor content when value prop changes (but not when user is editing)
  useEffect(() => {
    if (editor && value !== undefined && !isUserEditingRef.current) {
      const currentContent = editor.getHTML();
      // Only update if the content is actually different and it's not from user input
      if (currentContent !== value && currentContent !== lastUserContentRef.current) {
        editor.commands.setContent(value || '', false);
      }
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(`{{${variable}}}`).run();
  };

  const handleSetLink = () => {
    console.log('handleSetLink called with URL:', linkUrl);
    if (linkUrl) {
      // If no selection, extend mark range to apply link to surrounding word
      const chain = editor.chain().focus();
      chain.setLink({ href: linkUrl }).run();
      console.log('Link set via editor.chain');
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
    setSelectedText('');
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <div className="flex flex-col border border-border rounded-lg h-full focus-within:border-border focus-within:ring-0">
        {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50 flex-shrink-0 flex-wrap">
        {/* History */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <Select 
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' :
            editor.isActive('heading', { level: 4 }) ? '4' :
            editor.isActive('heading', { level: 5 }) ? '5' :
            editor.isActive('heading', { level: 6 }) ? '6' :
            'paragraph'
          }
          onValueChange={(value) => {
            if (value === 'paragraph') {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Normal</SelectItem>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
            <SelectItem value="4">H4</SelectItem>
            <SelectItem value="5">H5</SelectItem>
            <SelectItem value="6">H6</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Family */}
        <Select 
          value={editor.getAttributes('textStyle').fontFamily || 'Inter, sans-serif'}
          onValueChange={(value) => {
            editor.chain().focus().setMark('textStyle', { fontFamily: value }).run();
          }}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter, sans-serif">Inter</SelectItem>
            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
            <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
            <SelectItem value="Georgia, serif">Georgia</SelectItem>
            <SelectItem value="Times New Roman, serif">Times</SelectItem>
          </SelectContent>
        </Select>


        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-muted' : ''}`}
          onClick={() => {
            if (editor.isActive('link')) {
              handleUnsetLink();
            } else {
              // Save selected text before opening dialog
              const { from, to } = editor.state.selection;
              if (from !== to) {
                const text = editor.state.doc.textBetween(from, to);
                setSelectedText(text);
              } else {
                setSelectedText('');
              }
              setLinkDialogOpen(true);
            }
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
          onClick={() => {
            console.log('Bullet list clicked');
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
          onClick={() => {
            console.log('Ordered list clicked');
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Block Elements */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Variables */}
        <VariablePicker
          variables={[
            'firstName',
            'lastName',
            'email',
            'company',
            'position',
            'phone',
            'website'
          ]}
          onInsert={insertVariable}
          disabled={disabled}
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-4 min-h-0 overflow-auto">
        <EditorContent 
          editor={editor} 
          className="h-full focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:border-none [&_.ProseMirror]:shadow-none [&_.ProseMirror]:focus:shadow-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-foreground [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:p-0 [&_.ProseMirror]:m-0 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-bold [&_.ProseMirror_h4]:my-2 [&_.ProseMirror_h5]:text-sm [&_.ProseMirror_h5]:font-bold [&_.ProseMirror_h5]:my-1 [&_.ProseMirror_h6]:text-xs [&_.ProseMirror_h6]:font-bold [&_.ProseMirror_h6]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:text-gray-600 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_a:hover]:text-blue-800 [&_.ProseMirror_a]:cursor-pointer"
          style={{
            '--tw-ring-opacity': '0',
            '--tw-ring-offset-width': '0px'
          } as React.CSSProperties}
        />
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={(open) => {
        setLinkDialogOpen(open);
        if (!open) {
          setLinkUrl('');
          setSelectedText('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedText && (
              <div className="space-y-2">
                <Label>Selected Text</Label>
                <p className="text-sm text-muted-foreground italic">{selectedText}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetLink();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setLinkDialogOpen(false);
              setLinkUrl('');
              setSelectedText('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSetLink} disabled={!linkUrl.trim()}>
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
