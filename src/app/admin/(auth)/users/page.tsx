import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createUser, deleteUser } from '@/lib/actions/users'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') redirect('/admin')

  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-ink mb-6">Users</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Add user</h2>
        <form action={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={8}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <div className="flex gap-2">
            <select name="role" className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1">
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-clay-500 text-white rounded text-sm hover:bg-clay-600"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Role</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Joined</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-2 text-gray-500">{user.email}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  {user.id !== session!.user.id && (
                    <form action={deleteUser.bind(null, user.id)} className="inline">
                      <button type="submit" className="text-red-500 hover:text-red-700 text-xs">
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
