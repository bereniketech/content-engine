import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const SlashCommandPlugin = new PluginKey('slash-command')

export function createSlashCommandExtension(
  onOpen: (pos: { top: number; left: number }, paragraphText: string) => void
) {
  return Extension.create({
    name: 'slashCommand',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: SlashCommandPlugin,
          props: {
            handleKeyDown(view, event) {
              if (event.key !== '/') return false

              const { state } = view
              const { selection } = state
              const { $from } = selection

              // Only trigger at start of a paragraph
              const isAtStart = $from.parentOffset === 0
              if (!isAtStart) return false

              // Get paragraph text
              const paragraphText = $from.parent.textContent

              // Defer to allow the slash to be inserted first, then remove it
              setTimeout(() => {
                // Delete the slash character that was just typed
                const { state: newState } = view
                const tr = newState.tr.delete(
                  newState.selection.$from.pos,
                  newState.selection.$from.pos + 1
                )
                view.dispatch(tr)

                // Get position from DOM
                const domPos = view.coordsAtPos(newState.selection.$from.pos)
                onOpen({ top: domPos.bottom, left: domPos.left }, paragraphText)
              }, 0)

              return false
            },
          },
        }),
      ]
    },
  })
}
