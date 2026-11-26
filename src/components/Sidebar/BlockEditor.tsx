'use client';

import { useEffect, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';

export interface MentionNode {
  id: string;
  title: string;
  icon?: string;
}

interface BlockEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  availableNodes?: MentionNode[];
  onNodeLinked?: (nodeId: string) => void;
}

export default function BlockEditor({ initialMarkdown, onChange, availableNodes = [], onNodeLinked }: BlockEditorProps) {
  const [initialBlocks, setInitialBlocks] = useState<Block[] | 'loading'>('loading');

  const editor = useCreateBlockNote();

  useEffect(() => {
    async function loadInitialHTML() {
      if (initialMarkdown) {
        const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
        setInitialBlocks(blocks.length > 0 ? blocks : [{ type: 'paragraph', content: '' }] as any);
      } else {
        setInitialBlocks([{ type: 'paragraph', content: '' }] as any);
      }
    }
    loadInitialHTML();
  }, [editor, initialMarkdown]);

  useEffect(() => {
    if (initialBlocks !== 'loading') {
      editor.replaceBlocks(editor.document, initialBlocks);
    }
  }, [editor, initialBlocks]);

  if (initialBlocks === 'loading') {
    return (
      <div className="flex justify-center items-center h-48 text-gb-text-muted text-sm">
        Cargando editor...
      </div>
    );
  }

  // Generador de items para el menú "@"
  const getMentionItems = async (query: string) => {
    return availableNodes
      .filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
      .map(n => ({
        title: n.title,
        icon: <span>{n.icon || '📄'}</span>,
        onItemClick: () => {
          // Insertamos un enlace a la nota con el esquema interno
          editor.insertInlineContent([
            { type: 'link', href: `glyphbrain://${n.id}`, content: `${n.title}` },
            { type: 'text', text: ' ' }
          ]);
          if (onNodeLinked) onNodeLinked(n.id);
        }
      }));
  };

  return (
    <div className="blocknote-custom-wrapper">
      <BlockNoteView
        editor={editor}
        theme="dark"
        onChange={async () => {
          const markdown = await editor.blocksToMarkdownLossy(editor.document);
          onChange(markdown);
        }}
      >
        <SuggestionMenuController
          triggerCharacter={"@"}
          getItems={getMentionItems}
        />
        <SuggestionMenuController
          triggerCharacter={"["}
          getItems={getMentionItems}
        />
      </BlockNoteView>
    </div>
  );
}
