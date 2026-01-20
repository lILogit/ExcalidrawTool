/**
 * Canvas Context Types
 * Predefined context for enriching AI prompts
 */

/**
 * Predefined domain types for canvas context
 */
export type CanvasDomain =
  | 'software-architecture'
  | 'flowchart'
  | 'mindmap'
  | 'system-design'
  | 'database-schema'
  | 'network-diagram'
  | 'uml'
  | 'wireframe'
  | 'org-chart'
  | 'process-flow'
  | 'brainstorm'
  | 'general'
  | 'custom'

/**
 * Domain-specific terminology entry
 */
export interface TerminologyEntry {
  term: string
  definition: string
}

/**
 * Color meaning for style guide
 */
export interface ColorMeaning {
  color: string // Hex color
  meaning: string // What this color represents
}

/**
 * Style guide for canvas elements
 */
export interface CanvasStyleGuide {
  nodeNamingConvention?: 'camelCase' | 'PascalCase' | 'snake_case' | 'sentence-case' | 'UPPERCASE'
  connectionLabeling?: string // e.g., "verb phrases", "nouns"
  colorMeanings?: ColorMeaning[]
}

/**
 * AI response style preference
 */
export type ResponseStyle = 'concise' | 'detailed' | 'technical' | 'beginner-friendly'

/**
 * Main canvas context interface
 * Defines metadata and context for AI prompt enrichment
 */
export interface CanvasContext {
  // Basic Info
  title: string
  description: string

  // Domain Context
  domain: CanvasDomain
  customDomain?: string // Used when domain is 'custom'

  // Conventions and Terminology
  conventions: string[]
  terminology: TerminologyEntry[]

  // Style Guide
  styleGuide?: CanvasStyleGuide

  // AI Behavior
  aiInstructions?: string // Custom instructions for AI
  responseStyle?: ResponseStyle

  // Metadata
  createdAt: number
  updatedAt: number
}

/**
 * Default empty canvas context
 */
export const DEFAULT_CANVAS_CONTEXT: CanvasContext = {
  title: '',
  description: '',
  domain: 'general',
  conventions: [],
  terminology: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Get display name for a domain
 */
export function getDomainDisplayName(domain: CanvasDomain): string {
  const displayNames: Record<CanvasDomain, string> = {
    'software-architecture': 'Software Architecture',
    'flowchart': 'Flowchart',
    'mindmap': 'Mind Map',
    'system-design': 'System Design',
    'database-schema': 'Database Schema',
    'network-diagram': 'Network Diagram',
    'uml': 'UML Diagram',
    'wireframe': 'Wireframe',
    'org-chart': 'Organization Chart',
    'process-flow': 'Process Flow',
    'brainstorm': 'Brainstorm',
    'general': 'General',
    'custom': 'Custom',
  }
  return displayNames[domain]
}

/**
 * Get all available domains as options
 */
export function getDomainOptions(): Array<{ value: CanvasDomain; label: string }> {
  const domains: CanvasDomain[] = [
    'general',
    'software-architecture',
    'system-design',
    'flowchart',
    'process-flow',
    'mindmap',
    'brainstorm',
    'database-schema',
    'uml',
    'network-diagram',
    'wireframe',
    'org-chart',
    'custom',
  ]
  return domains.map((d) => ({ value: d, label: getDomainDisplayName(d) }))
}
