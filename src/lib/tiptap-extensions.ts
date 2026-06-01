import { Extension, Node, mergeAttributes } from '@tiptap/core'

// Augment Tiptap's command types so TypeScript knows about our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    flourish: {
      insertFlourish: (symbol: string) => ReturnType
    }
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element =>
              element.style.fontSize?.replace('px', '') || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    }
  },
})

export const Flourish = Node.create({
  name: 'flourish',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      symbol: { default: '✦ ── ✦' },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-flourish]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-flourish': '' }, HTMLAttributes),
      HTMLAttributes.symbol as string,
    ]
  },
  addCommands() {
    return {
      insertFlourish:
        (symbol: string) =>
        ({ chain }: any) =>
          chain().insertContent({ type: 'flourish', attrs: { symbol } }).run(),
    }
  },
})
