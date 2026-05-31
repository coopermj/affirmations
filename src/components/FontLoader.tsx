import type { Font } from '@prisma/client'

interface Props {
  fonts: Font[]
  adobeEmbedCode: string | null
}

export function FontLoader({ fonts, adobeEmbedCode }: Props) {
  const googleFamilies = fonts
    .filter(f => f.type === 'GOOGLE' && f.googleFamily)
    .map(f => f.googleFamily!.replace(/ /g, '+'))

  const uploadedFonts = fonts.filter(f => f.type === 'UPLOADED' && f.r2Url)

  return (
    <>
      {googleFamilies.length > 0 && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${googleFamilies
            .map(f => `family=${f}:wght@100..900`)
            .join('&')}&display=swap`}
        />
      )}
      {uploadedFonts.length > 0 && (
        <style>{uploadedFonts
          .map(
            f => `@font-face {
  font-family: '${f.name}';
  src: url('${f.r2Url}') format('woff2');
  font-display: swap;
}`,
          )
          .join('\n')}</style>
      )}
      {adobeEmbedCode && (
        <link rel="stylesheet" href={adobeEmbedCode} />
      )}
    </>
  )
}
