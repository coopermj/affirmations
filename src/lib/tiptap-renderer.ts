/**
 * Server-side Tiptap JSON → HTML renderer.
 * Uses a pure-string recursive approach to avoid DOM dependency in Node.js.
 */

type Mark = {
  type: string
  attrs?: Record<string, unknown>
}

type JSONNode = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: Mark[]
  content?: JSONNode[]
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildStyleFromTextStyleAttrs(attrs: Record<string, unknown>): string {
  const parts: string[] = []
  if (attrs.color && typeof attrs.color === 'string') {
    parts.push(`color: ${attrs.color}`)
  }
  if (attrs.fontSize && typeof attrs.fontSize === 'string') {
    const size = attrs.fontSize.endsWith('px')
      ? attrs.fontSize
      : `${attrs.fontSize}px`
    parts.push(`font-size: ${size}`)
  }
  if (attrs.fontFamily && typeof attrs.fontFamily === 'string') {
    parts.push(`font-family: ${attrs.fontFamily}`)
  }
  return parts.join('; ')
}

function applyMarksOpen(marks: Mark[]): string {
  return marks
    .map(mark => {
      switch (mark.type) {
        case 'bold':
          return '<strong>'
        case 'italic':
          return '<em>'
        case 'strike':
          return '<s>'
        case 'underline':
          return '<u>'
        case 'code':
          return '<code>'
        case 'textStyle': {
          const style = mark.attrs ? buildStyleFromTextStyleAttrs(mark.attrs) : ''
          return style ? `<span style="${escapeHtml(style)}">` : '<span>'
        }
        case 'link': {
          const href = mark.attrs?.href ? escapeHtml(String(mark.attrs.href)) : '#'
          return `<a href="${href}">`
        }
        default:
          return ''
      }
    })
    .join('')
}

function applyMarksClose(marks: Mark[]): string {
  return [...marks]
    .reverse()
    .map(mark => {
      switch (mark.type) {
        case 'bold':
          return '</strong>'
        case 'italic':
          return '</em>'
        case 'strike':
          return '</s>'
        case 'underline':
          return '</u>'
        case 'code':
          return '</code>'
        case 'textStyle':
          return '</span>'
        case 'link':
          return '</a>'
        default:
          return ''
      }
    })
    .join('')
}

function renderNode(node: JSONNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNode).join('')

    case 'paragraph': {
      const inner = (node.content ?? []).map(renderNode).join('')
      const align = node.attrs?.textAlign
      const style = align && align !== 'left' ? ` style="text-align: ${align}"` : ''
      return `<p${style}>${inner}</p>`
    }

    case 'text': {
      const marks = node.marks ?? []
      const escaped = escapeHtml(node.text ?? '')
      return applyMarksOpen(marks) + escaped + applyMarksClose(marks)
    }

    case 'flourish': {
      const symbol = escapeHtml(node.attrs?.symbol ? String(node.attrs.symbol) : '✦ ── ✦')
      return `<span data-flourish="">${symbol}</span>`
    }

    case 'heading': {
      const level = node.attrs?.level ?? 1
      const tag = `h${level}`
      const inner = (node.content ?? []).map(renderNode).join('')
      const align = node.attrs?.textAlign
      const style = align && align !== 'left' ? ` style="text-align: ${align}"` : ''
      return `<${tag}${style}>${inner}</${tag}>`
    }

    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`

    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`

    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`

    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`

    case 'codeBlock':
      return `<pre><code>${(node.content ?? []).map(renderNode).join('')}</code></pre>`

    case 'hardBreak':
      return '<br>'

    case 'horizontalRule':
      return '<hr>'

    default:
      // Fallback: render children if any
      return (node.content ?? []).map(renderNode).join('')
  }
}

export function renderContent(json: Record<string, unknown>): string {
  return renderNode(json as unknown as JSONNode)
}
