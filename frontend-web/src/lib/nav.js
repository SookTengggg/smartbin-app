import { Camera, ChartColumn, List, SlidersHorizontal } from 'lucide-react'

// The four pages, in sidebar order.
export const PAGES = [
  { id: 'receiver', label: 'Waste receiver', icon: Camera, title: 'Waste receiver', sub: 'Log a disposal: photo, weight and reason.' },
  { id: 'dashboard', label: 'Analytics dashboard', icon: ChartColumn, title: 'Analytics dashboard', sub: 'How much food is thrown away, what it costs, and why.' },
  { id: 'log', label: 'Live log', icon: List, title: 'Live log', sub: 'Every disposal, newest first.' },
  { id: 'admin', label: 'Admin', icon: SlidersHorizontal, title: 'Admin', sub: 'Set the price of each food category.' },
]
