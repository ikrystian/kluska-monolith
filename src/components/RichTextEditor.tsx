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
  CodeXml,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'html' | 'preview'>('editor');
  const isUpdatingRef = useRef(false);

  // Update editor content when value changes externally or when activeTab becomes 'editor'
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, activeTab]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange]);

  const handleHtmlChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      isUpdatingRef.current = false;
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;
        const updated = currentVal.substring(0, start) + '  ' + currentVal.substring(end);
        isUpdatingRef.current = false;
        onChange(updated);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [onChange]
  );

  const execCommand = useCallback(
    (command: string, cmdValue?: string) => {
      document.execCommand(command, false, cmdValue);
      editorRef.current?.focus();
      handleInput();
    },
    [handleInput]
  );

  const insertHeading = useCallback(
    (level: number) => {
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
    },
    [handleInput]
  );

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

  const insertHtmlSnippet = useCallback(() => {
    const html = prompt('Wprowadź kod HTML do wstawienia:');
    if (!html) return;

    if (activeTab === 'editor') {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        const fragment = template.content;
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
      } else {
        onChange((value || '') + html);
      }
    } else if (activeTab === 'html') {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;
        const updated = currentVal.substring(0, start) + html + currentVal.substring(end);
        onChange(updated);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + html.length;
        });
      } else {
        onChange((value || '') + html);
      }
    } else {
      onChange((value || '') + html);
    }
  }, [activeTab, handleInput, onChange, value]);

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Pogrubienie (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Kursywa (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Podkreślenie (Ctrl+U)' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Blok kodu (<pre>)' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Cytat' },
    { icon: List, command: 'insertUnorderedList', title: 'Lista punktowana' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Lista numerowana' },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'html' | 'preview')}>
        <div className="border-b bg-muted/30">
          <div className="flex items-center justify-between px-2 py-1 gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Formatting buttons */}
              {toolbarButtons.map(({ icon: Icon, command, value: cmdVal, title }) => (
                <Button
                  key={command + (cmdVal || '')}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => execCommand(command, cmdVal)}
                  disabled={activeTab !== 'editor'}
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
                disabled={activeTab !== 'editor'}
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
                disabled={activeTab !== 'editor'}
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
                disabled={activeTab !== 'editor'}
                title="Nagłówek 3"
              >
                <Heading3 className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Links and images and HTML */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={insertLink}
                disabled={activeTab !== 'editor'}
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
                disabled={activeTab !== 'editor'}
                title="Wstaw obraz"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={insertHtmlSnippet}
                disabled={activeTab === 'preview'}
                title="Wstaw kod HTML"
              >
                <CodeXml className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Undo/Redo */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => execCommand('undo')}
                disabled={activeTab !== 'editor'}
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
                disabled={activeTab !== 'editor'}
                title="Ponów (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <TabsList className="h-8">
              <TabsTrigger value="editor" className="text-xs">Edytor wizualny</TabsTrigger>
              <TabsTrigger value="html" className="text-xs">Kod HTML</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Podgląd</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="editor"
          forceMount
          className={cn('m-0', activeTab !== 'editor' && 'hidden')}
        >
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

        <TabsContent
          value="html"
          forceMount
          className={cn('m-0', activeTab !== 'html' && 'hidden')}
        >
          <textarea
            ref={textareaRef}
            value={value || ''}
            onChange={handleHtmlChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Wpisz lub wklej kod HTML (np. <div>, <p>, <table>, <iframe>)..."
            className="w-full min-h-[400px] max-h-[600px] overflow-y-auto p-4 font-mono text-sm bg-background text-foreground focus:outline-none resize-y leading-relaxed border-0 focus-visible:ring-0"
            spellCheck={false}
          />
        </TabsContent>

        <TabsContent
          value="preview"
          forceMount
          className={cn('m-0', activeTab !== 'preview' && 'hidden')}
        >
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
            dangerouslySetInnerHTML={{ __html: value || '' }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
