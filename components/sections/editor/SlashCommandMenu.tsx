'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type EditAction = 'rewrite' | 'expand' | 'shorten' | 'change_tone' | 'fix_seo' | 'add_stat'
export type ToneOption = 'Professional' | 'Conversational' | 'Persuasive' | 'Empathetic'

interface SlashCommandMenuProps {
  position: { top: number; left: number }
  onSelect: (action: EditAction, tone?: ToneOption) => void
  onClose: () => void
}

const MAIN_ITEMS: Array<{ action: EditAction; label: string; icon: string }> = [
  { action: 'rewrite', label: 'Rewrite', icon: '✍️' },
  { action: 'expand', label: 'Expand', icon: '📝' },
  { action: 'shorten', label: 'Shorten', icon: '✂️' },
  { action: 'change_tone', label: 'Change Tone', icon: '🎭' },
  { action: 'fix_seo', label: 'Fix SEO', icon: '🔍' },
  { action: 'add_stat', label: 'Add Statistic', icon: '📊' },
]

const TONE_OPTIONS: ToneOption[] = ['Professional', 'Conversational', 'Persuasive', 'Empathetic']

export function SlashCommandMenu({ position, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [toneExpanded, setToneExpanded] = useState(false)
  const [toneFocusedIndex, setToneFocusedIndex] = useState(0)

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (toneExpanded) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setToneFocusedIndex((i) => (i + 1) % TONE_OPTIONS.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setToneFocusedIndex((i) => (i - 1 + TONE_OPTIONS.length) % TONE_OPTIONS.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onSelect('change_tone', TONE_OPTIONS[toneFocusedIndex])
          onClose()
        } else if (e.key === 'ArrowLeft') {
          setToneExpanded(false)
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => (i + 1) % MAIN_ITEMS.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => (i - 1 + MAIN_ITEMS.length) % MAIN_ITEMS.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = MAIN_ITEMS[focusedIndex]
        if (item.action === 'change_tone') {
          setToneExpanded(true)
        } else {
          onSelect(item.action)
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, toneExpanded, toneFocusedIndex, onSelect, onClose])

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52 text-sm"
      style={{ top: position.top, left: position.left }}
    >
      {MAIN_ITEMS.map((item, i) => (
        <div key={item.action}>
          <button
            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 ${
              focusedIndex === i && !toneExpanded ? 'bg-gray-100' : ''
            }`}
            onMouseEnter={() => setFocusedIndex(i)}
            onClick={() => {
              if (item.action === 'change_tone') {
                setToneExpanded((v) => !v)
              } else {
                onSelect(item.action)
                onClose()
              }
            }}
          >
            <span>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.action === 'change_tone' && <span className="text-gray-400">›</span>}
          </button>
          {item.action === 'change_tone' && toneExpanded && (
            <div className="bg-gray-50 border-t border-b border-gray-100">
              {TONE_OPTIONS.map((tone, ti) => (
                <button
                  key={tone}
                  className={`w-full text-left px-6 py-1.5 hover:bg-gray-100 ${
                    toneFocusedIndex === ti ? 'bg-gray-100' : ''
                  }`}
                  onMouseEnter={() => setToneFocusedIndex(ti)}
                  onClick={() => {
                    onSelect('change_tone', tone)
                    onClose()
                  }}
                >
                  {tone}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}
