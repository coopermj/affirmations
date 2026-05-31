import { renderContent } from '@/lib/tiptap-renderer'

describe('renderContent', () => {
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
})
