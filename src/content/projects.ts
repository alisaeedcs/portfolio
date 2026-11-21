export interface Project {
  id: string
  title: string
  description: string[] // one short line each
  shape: 'blob' | 'dotbox' | 'window' | 'robot'
  link?: string
}

// `shape` picks the object shown beside each project. More to come: bruinseats and ridesort, once they're deployed.
export const projects: Project[] = [
  {
    id: 'xlerobot',
    title: 'xlerobot',
    description: [
      "i'm training it in nvidia's isaac lab, across thousands of simulations.",
      "when it's ready, it'll help with whatever i ask.",
      'think fetching things from the fridge, folding clothes, doing laundry, and more.',
    ],
    shape: 'robot',
  },
]
