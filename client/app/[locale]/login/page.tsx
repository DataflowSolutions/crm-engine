import { login, signup } from './actions'

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ message?: string }> 
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {/* Header */}
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Welcome Back 👋
        </h1>

        {/* Message */}
        {params?.message && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {decodeURIComponent(params.message)}
          </div>
        )}

        {/* Form */}
        <form className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none"
            >
              Sign up
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          By continuing, you agree to our{' '}
          <a
            href="#"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="#"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
