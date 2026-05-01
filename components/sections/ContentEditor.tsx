'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'
import { SlashCommandMenu, type EditAction, type ToneOption } from './editor/SlashCommandMenu'
import { createSlashCommandExtension } from './editor/SlashCommandExtension'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface ArticleContext {
  title: string
  keyword: string
  audience: string
}

interface ContentEditorProps {
  content: string
  sessionId: string
  assetId?: string
  articleContext?: ArticleContext
  articleContextRef?: React.RefObject<ArticleContext | null>
  onSave?: (html: string) => void
  onSeoRescore?: () => void
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => (line.startsWith('<') ? line : `<p>${line}</p>`))
}

function getSelectedOrCurrentParagraph(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return ''
  const { from, to, empty } = editor.state.selection
  if (!empty) return editor.state.doc.textBetween(from, to)
  const node = editor.state.selection.$from.parent
  return node.textContent
}

function replaceParagraphInEditor(editor: Editor, oldText: string, newText: string) {
  editor.commands.command(({ tr, state }) => {
    let replaced = false
    state.doc.descendants((node, pos) => {
      if (!replaced && node.type.name === 'paragraph' && node.textContent === oldText) {
        tr.replaceWith(
          pos,
          pos + node.nodeSize,
          state.schema.nodes.paragraph.create(null, newText ? state.schema.text(newText) : null)
        )
        replaced = true
      }
    })
    return replaced
  })
}

export default function ContentEditor({ content, sessionId, assetId, articleContext, onSave, onSeoRescore }: ContentEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedParagraphText, setSelectedParagraphText] = useState('')
  const [editStatus, setEditStatus] = useState<string | null>(null)

  const slashCommandExtension = createSlashCommandExtension((pos, paragraphText) => {
    setSlashMenuPosition(pos)
    setSelectedParagraphText(paragraphText)
    setSlashMenuOpen(true)
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Article content appears here…' }),
      slashCommandExtension,
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedClearRef.current) clearTimeout(savedClearRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const html = ed.getHTML()
        onSave?.(html)
        if (assetId) {
          try {
            const supabase = getSupabaseBrowserClient()
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData.session?.access_token
            const res = await fetch(`/api/content-assets/${assetId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ content: { text: html, editedAt: new Date().toISOString() } }),
            })
            setSaveStatus(res.ok ? 'saved' : 'error')
            if (res.ok) {
              savedClearRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
            }
          } catch {
            setSaveStatus('error')
          }
        } else {
          setSaveStatus('saved')
          savedClearRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        }
      }, 2000)
    },
  })

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedClearRef.current) clearTimeout(savedClearRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Sync content prop changes into editor
  useEffect(() => {
    if (editor && content) {
      const html = markdownToHtml(content)
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html, { emitUpdate: false })
      }
    }
  }, [content, editor])

  const handleActionSelected = async (action: EditAction, paragraphText: string, tone?: ToneOption) => {
    if (!editor || !paragraphText) return
    setEditStatus('Editing…')
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          paragraph: paragraphText,
          action,
          tone,
          articleContext: articleContext ?? { title: '', keyword: '', audience: '' },
        }),
      })

      if (!res.ok || !res.body) {
        setEditStatus('Edit failed')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const { delta } = JSON.parse(line.slice(6)) as { delta?: string }
            if (delta) accumulated += delta
          } catch {
            // skip malformed chunks
          }
        }
      }

      if (accumulated) {
        replaceParagraphInEditor(editor, paragraphText, accumulated)
        if (action === 'fix_seo' && onSeoRescore) onSeoRescore()
      }
      setEditStatus(null)
    } catch {
      setEditStatus('Edit failed')
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const paragraphText = getSelectedOrCurrentParagraph(editor)
    setSlashMenuPosition({ top: e.clientY, left: e.clientX })
    setSelectedParagraphText(paragraphText)
    setSlashMenuOpen(true)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
        <span>✏️ Editing</span>
        {editStatus && <span className="ml-auto">{editStatus}</span>}
        {!editStatus && saveStatus === 'saving' && <span className="ml-auto text-gray-400">Saving…</span>}
        {!editStatus && saveStatus === 'saved' && <span className="ml-auto text-green-600">Saved ✓</span>}
        {!editStatus && saveStatus === 'error' && <span className="ml-auto text-red-600">Save failed</span>}
      </div>
      <div onContextMenu={handleContextMenu}>
        <EditorContent editor={editor} />
      </div>
      {slashMenuOpen && (
        <SlashCommandMenu
          position={slashMenuPosition}
          onSelect={(action, tone) => {
            void handleActionSelected(action, selectedParagraphText, tone)
            setSlashMenuOpen(false)
          }}
          onClose={() => setSlashMenuOpen(false)}
        />
      )}
    </div>
  )
}
