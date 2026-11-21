export interface Role {
  title: string
  company: string
  dates: string
  summary: string
  viz?: 'lidar' | 'accelerator' | 'hillside' // the scene beside the role; left out for entries that have none, like school
  vizLabel?: string
}

// Newest first. Summaries are just the focus area and location for now.
export const experience: Role[] = [
  {
    title: 'software engineer intern',
    company: 'berkeley lab engineering',
    dates: 'sep 2026',
    summary: 'particle accelerator instrumentation.',
    viz: 'accelerator',
    vizLabel: 'accelerator beamline',
  },
  {
    title: 'software engineer intern',
    company: 'matterport',
    dates: 'jun – aug 2026',
    summary: 'agentic testing systems.',
    viz: 'lidar',
    vizLabel: 'lidar scan of a forest',
  },
  {
    title: 'software engineer intern',
    company: 'berkeley lab',
    dates: 'jan – sep 2025',
    summary: 'geospatial sensing infrastructure.',
    viz: 'hillside',
    vizLabel: 'hillside sensor network',
  },
  {
    title: 'statistics and data science',
    company: 'ucla',
    dates: 'senior',
    summary: 'graduating this june.',
  },
]
