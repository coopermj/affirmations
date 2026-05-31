interface Props {
  html: string
  backgroundUrl: string | null
  defaultFontFamily: string | null
}

export function AffirmationPage({ html, backgroundUrl, defaultFontFamily }: Props) {
  const background = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})` }
    : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...background,
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: defaultFontFamily ?? 'Georgia, serif',
        }}
      >
        <div
          className="affirmation-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
