'use client'

export default function Home() {
  return (
    <main className="flex items-center justify-center h-full min-h-screen text-center px-8">
      <div>
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Story Vault</h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          Select a client from the sidebar to view their stories, or add a new client to get started.
        </p>
      </div>
    </main>
  )
}
