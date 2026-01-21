'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const isUpdatingRef = useRef(false);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const insertHeading = useCallback((level: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const heading = document.createElement(`h${level}`);
    heading.textContent = selection.toString() || `Nagłówek ${level}`;

    range.deleteContents();
    range.insertNode(heading);

    // Move cursor after heading
    range.setStartAfter(heading);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  const insertLink = useCallback(() => {
    const url = prompt('Wprowadź URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  const insertImage = useCallback(() => {
    const url = prompt('Wprowadź URL obrazu:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Pogrubienie (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Kursywa (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Podkreślenie (Ctrl+U)' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Kod' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Cytat' },
    { icon: List, command: 'insertUnorderedList', title: 'Lista punktowana' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Lista numerowana' },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')}>
        <div className="border-b bg-muted/30">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Formatting buttons */}
              {toolbarButtons.map(({ icon: Icon, command, value, title }) => (
                <Button
                  key={command + (value || '')}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => execCommand(command, value)}
                  title={title}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}

              <div className="w-px h-6 bg-border mx-1" />

              {/* Headings */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertHeading(1)}
                title="Nagłówek 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertHeading(2)}
                title="Nagłówek 2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => insertHeading(3)}
                title="Nagłówek 3"
              >
                <Heading3 className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Links and images */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={insertLink}
                title="Wstaw link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={insertImage}
                title="Wstaw obraz"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Undo/Redo */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => execCommand('undo')}
                title="Cofnij (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => execCommand('redo')}
                title="Ponów (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <TabsList className="h-8">
              <TabsTrigger value="editor" className="text-xs">Edytor</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Podgląd</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="editor" className="m-0">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 focus:outline-none
              [&_h1]:font-headline [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:my-4
              [&_h2]:font-headline [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:my-3
              [&_h3]:font-headline [&_h3]:font-bold [&_h3]:text-xl [&_h3]:my-3
              [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
              [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:my-1 [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4
              [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:font-code
              [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-code
              [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
              [&_strong]:font-bold [&_em]:italic [&_u]:underline
              empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div
            className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 bg-muted/20
              [&_h1]:font-headline [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:my-4
              [&_h2]:font-headline [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:my-3
              [&_h3]:font-headline [&_h3]:font-bold [&_h3]:text-xl [&_h3]:my-3
              [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
              [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:my-1 [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4
              [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:font-code
              [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-code
              [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
              [&_strong]:font-bold [&_em]:italic [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
