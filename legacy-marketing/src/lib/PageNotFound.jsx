import { useLocation } from 'react-router-dom'

export default function PageNotFound() {
  const location = useLocation()
  const pageName = location.pathname.slice(1) || 'home'

  return (
    <div className="min-h-screen bg-slate-50 px-6">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">404</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Page not found</h1>
          <p className="mt-4 text-slate-600">
            The route <span className="font-medium text-slate-800">/{pageName}</span> does not
            exist in this build of Quill.
          </p>
          <a
            href="/"
            className="mt-8 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
