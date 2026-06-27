'use client'

import Link from 'next/link'
import type { Project } from '@/lib/types'

type Props = {
  clientId: string
  projects: Project[]
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  talk: 'Talk',
  webinar: 'Webinar',
  sales_presentation: 'Sales Presentation',
  email_campaign: 'Email Campaign',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-50 text-blue-700',
  ready_for_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
}

const TYPE_STYLES: Record<string, string> = {
  talk: 'bg-purple-50 text-purple-700',
  webinar: 'bg-indigo-50 text-indigo-700',
  sales_presentation: 'bg-teal-50 text-teal-700',
  email_campaign: 'bg-orange-50 text-orange-700',
}

export default function ProjectsPanel({ clientId, projects }: Props) {
  const activeProjects = projects.filter((p) => p.status !== 'archived')

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Projects</h2>
          <p className="text-xs text-gray-400 mt-0.5">Talks, webinars, presentations, and campaigns</p>
        </div>
        <Link
          href={`/clients/${clientId}/projects`}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Project
        </Link>
      </div>

      <div className="px-5 py-4">
        {activeProjects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No projects yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mb-3">
              Build talks, webinars, presentations, and email campaigns from your story vault.
            </p>
            <Link
              href={`/clients/${clientId}/projects`}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Start a Project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <Link key={project.id} href={`/clients/${clientId}/projects/${project.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[project.project_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {PROJECT_TYPE_LABELS[project.project_type]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {project.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{project.title}</p>
                  {project.goal && <p className="text-xs text-gray-400 truncate mt-0.5">{project.goal}</p>}
                </div>
                {project.readiness_score != null && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-800">{Math.round(project.readiness_score)}</p>
                    <p className="text-xs text-gray-400">readiness</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
