interface Props {
  html: string
  backgroundUrl: string | null
  backgroundGradient?: string | null
  defaultFontFamily: string | null
}

// Warm "last light" gradient for pages without a specific image or gradient.
const FALLBACK_GRADIENT =
  'radial-gradient(120% 120% at 50% 0%, #8a4b38 0%, #5e3550 45%, #2c2236 100%)'

export function AffirmationPage({
  html,
  backgroundUrl,
  backgroundGradient,
  defaultFontFamily,
}: Props) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background layer: image > gradient > fallback */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={
          backgroundUrl
            ? { backgroundImage: `url("${backgroundUrl}")` }
            : { background: backgroundGradient || FALLBACK_GRADIENT }
        }
      />

      {/* Legibility scrim — subtle vignette + center darkening over imagery */}
      {backgroundUrl && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(110% 90% at 50% 50%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.45) 100%)',
          }}
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-10">
        <div
          className="affirmation-content animate-[fadein_1.1s_ease-out]"
          style={defaultFontFamily ? { fontFamily: defaultFontFamily } : undefined}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html:
            '@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
        }}
      />
    </div>
  )
}
