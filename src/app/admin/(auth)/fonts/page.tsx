import { db } from '@/lib/db'
import { addGoogleFont, deleteFont, setAdobeEmbedCode, addAdobeFont } from '@/lib/actions/fonts'
import { FontUploader } from '@/components/admin/FontUploader'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function FontsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'

  const [fonts, settings] = await Promise.all([
    db.font.findMany({ orderBy: { name: 'asc' } }),
    db.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  const googleFonts = fonts.filter(f => f.type === 'GOOGLE')
  const uploadedFonts = fonts.filter(f => f.type === 'UPLOADED')
  const adobeFonts = fonts.filter(f => f.type === 'ADOBE')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Fonts</h1>

      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Google Fonts</h2>
        <form action={addGoogleFont} className="flex gap-2 mb-4">
          <input
            name="name"
            placeholder="e.g. Playfair Display"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
            Add
          </button>
        </form>
        <FontList fonts={googleFonts} r2KeyExtractor={() => null} />
      </section>

      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Uploaded Fonts</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <FontUploader />
        </div>
        <FontList
          fonts={uploadedFonts}
          r2KeyExtractor={f => (f.r2Url ? new URL(f.r2Url).pathname.slice(1) : null)}
        />
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-lg font-medium text-gray-800 mb-3">Adobe Fonts</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">
              Adobe Fonts project CSS URL (e.g. <code>https://use.typekit.net/abc.css</code>).
              Injected into every public page.
            </p>
            <form action={setAdobeEmbedCode} className="flex gap-2">
              <input
                name="code"
                defaultValue={settings?.adobeEmbedCode ?? ''}
                placeholder="https://use.typekit.net/abc.css"
                className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                Save
              </button>
            </form>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">Add individual Adobe font names for the editor picker:</p>
            <form action={addAdobeFont} className="flex gap-2">
              <input
                name="name"
                placeholder="e.g. Proxima Nova"
                required
                className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                Add
              </button>
            </form>
          </div>
          <FontList fonts={adobeFonts} r2KeyExtractor={() => null} />
        </section>
      )}
    </div>
  )
}

function FontList({
  fonts,
  r2KeyExtractor,
}: {
  fonts: { id: string; name: string; type: string; googleFamily: string | null; r2Url: string | null }[]
  r2KeyExtractor: (f: { r2Url: string | null }) => string | null
}) {
  if (fonts.length === 0) return <p className="text-sm text-gray-400">None yet.</p>
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {fonts.map(f => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">{f.name}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {f.googleFamily ?? f.r2Url ?? ''}
              </td>
              <td className="px-4 py-2 text-right">
                <form action={deleteFont.bind(null, f.id, r2KeyExtractor(f))} className="inline">
                  <button type="submit" className="text-red-500 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
