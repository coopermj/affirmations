import { renderContent, smartQuotes } from '@/lib/tiptap-renderer'

describe('smartQuotes', () => {
  it('converts double quotes to opening and closing curly quotes', () => {
    expect(smartQuotes('She said "hello" today')).toBe('She said “hello” today')
  })

  it('converts apostrophes in contractions', () => {
    expect(smartQuotes("you're worthy")).toBe('you’re worthy')
  })

  it('converts a leading single quote to an opening quote', () => {
    expect(smartQuotes("'tis the season")).toBe('‘tis the season')
  })

  it('handles a full sentence with mixed quotes', () => {
    expect(smartQuotes('"You\'re enough," she said.')).toBe('“You’re enough,” she said.')
  })
})

describe('renderContent', () => {
  it('renders curly quotes in affirmation text', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'You\'re "worthy"' }] },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('You’re “worthy”')
  })

  it('renders a plain paragraph', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('Hello world')
    expect(html).toContain('<p')
  })

  it('renders bold text', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'Bold text',
            },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('<strong>')
    expect(html).toContain('Bold text')
  })

  it('renders text with a color mark', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                { type: 'textStyle', attrs: { color: '#ff0000', fontFamily: null, fontSize: null } },
              ],
              text: 'Red text',
            },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('color: #ff0000')
    expect(html).toContain('Red text')
  })

  it('renders a flourish node', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'flourish', attrs: { symbol: '✦ ── ✦' } },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('✦ ── ✦')
    expect(html).toContain('data-flourish')
  })

  it('renders paragraph with textAlign attribute', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [{ type: 'text', text: 'Centered' }],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('style="text-align: center"')
    expect(html).toContain('Centered')
  })

  it('does not add style for default left alignment', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'Left' }],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).not.toContain('style=')
    expect(html).toContain('<p>')
  })
})
