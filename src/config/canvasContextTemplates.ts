/**
 * Canvas Context Templates
 * Predefined templates for common diagram domains
 */

import type {
  CanvasContext,
  CanvasDomain,
  TerminologyEntry,
  CanvasStyleGuide,
  ResponseStyle,
} from '@/types/canvasContext'

/**
 * Template definition for a canvas domain
 */
export interface CanvasContextTemplate {
  domain: CanvasDomain
  defaultTitle: string
  defaultDescription: string
  conventions: string[]
  terminology: TerminologyEntry[]
  styleGuide: CanvasStyleGuide
  aiInstructions: string
  responseStyle: ResponseStyle
}

/**
 * Software Architecture template
 */
const softwareArchitectureTemplate: CanvasContextTemplate = {
  domain: 'software-architecture',
  defaultTitle: 'Software Architecture Diagram',
  defaultDescription: 'System architecture showing components and their interactions',
  conventions: [
    'Components are represented as rectangles',
    'Data flows are shown with arrows',
    'External systems are shown with dashed borders',
    'Databases use cylinder shapes',
    'Use clear, descriptive names for all components',
  ],
  terminology: [
    { term: 'Service', definition: 'A self-contained unit of functionality' },
    { term: 'API', definition: 'Application Programming Interface - communication contract' },
    { term: 'Gateway', definition: 'Entry point that routes requests to services' },
    { term: 'Cache', definition: 'Temporary storage for frequently accessed data' },
    { term: 'Queue', definition: 'Asynchronous message buffer between services' },
  ],
  styleGuide: {
    nodeNamingConvention: 'PascalCase',
    connectionLabeling: 'verb phrases (e.g., "sends data to", "queries")',
    colorMeanings: [
      { color: '#a5d8ff', meaning: 'Frontend/Client components' },
      { color: '#b2f2bb', meaning: 'Backend services' },
      { color: '#ffec99', meaning: 'Databases/Storage' },
      { color: '#ffc9c9', meaning: 'External systems' },
    ],
  },
  aiInstructions:
    'Focus on scalability, maintainability, and clear separation of concerns. Suggest industry-standard patterns when applicable.',
  responseStyle: 'technical',
}

/**
 * Flowchart template
 */
const flowchartTemplate: CanvasContextTemplate = {
  domain: 'flowchart',
  defaultTitle: 'Process Flowchart',
  defaultDescription: 'Step-by-step visualization of a process or algorithm',
  conventions: [
    'Start/End points use ellipses',
    'Process steps use rectangles',
    'Decision points use diamonds',
    'Arrows show flow direction',
    'Yes/No labels on decision branches',
  ],
  terminology: [
    { term: 'Process', definition: 'An action or operation to be performed' },
    { term: 'Decision', definition: 'A branching point based on a condition' },
    { term: 'Terminator', definition: 'Start or end point of the flow' },
    { term: 'Connector', definition: 'Links to another part of the flowchart' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'conditions or outcomes',
    colorMeanings: [
      { color: '#b2f2bb', meaning: 'Start/End points' },
      { color: '#a5d8ff', meaning: 'Process steps' },
      { color: '#ffec99', meaning: 'Decision points' },
    ],
  },
  aiInstructions:
    'Ensure logical flow and clear decision paths. Suggest simplifications where processes can be combined.',
  responseStyle: 'concise',
}

/**
 * Mind Map template
 */
const mindmapTemplate: CanvasContextTemplate = {
  domain: 'mindmap',
  defaultTitle: 'Mind Map',
  defaultDescription: 'Visual representation of ideas branching from a central concept',
  conventions: [
    'Central topic in the middle',
    'Main branches radiate outward',
    'Sub-topics branch from main topics',
    'Use keywords, not sentences',
    'Related ideas can have cross-links',
  ],
  terminology: [
    { term: 'Central Topic', definition: 'The main subject at the center' },
    { term: 'Branch', definition: 'A main category stemming from the center' },
    { term: 'Sub-branch', definition: 'A detail or sub-category' },
    { term: 'Cross-link', definition: 'Connection between different branches' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'optional relationship labels',
    colorMeanings: [
      { color: '#ffec99', meaning: 'Central topic' },
      { color: '#a5d8ff', meaning: 'Main branches' },
      { color: '#b2f2bb', meaning: 'Sub-branches' },
    ],
  },
  aiInstructions:
    'Suggest related concepts and potential connections. Help organize ideas hierarchically.',
  responseStyle: 'concise',
}

/**
 * System Design template
 */
const systemDesignTemplate: CanvasContextTemplate = {
  domain: 'system-design',
  defaultTitle: 'System Design',
  defaultDescription: 'High-level design of a distributed system',
  conventions: [
    'Show major system components',
    'Include load balancers and CDNs where applicable',
    'Indicate data flow directions',
    'Mark synchronous vs asynchronous communication',
    'Include estimated scale/capacity where relevant',
  ],
  terminology: [
    { term: 'Load Balancer', definition: 'Distributes traffic across servers' },
    { term: 'CDN', definition: 'Content Delivery Network for static assets' },
    { term: 'Replica', definition: 'Copy of data/service for redundancy' },
    { term: 'Shard', definition: 'Horizontal partition of data' },
    { term: 'Message Broker', definition: 'Middleware for async communication' },
  ],
  styleGuide: {
    nodeNamingConvention: 'PascalCase',
    connectionLabeling: 'protocol and data type (e.g., "REST/JSON", "gRPC")',
    colorMeanings: [
      { color: '#a5d8ff', meaning: 'Compute/Services' },
      { color: '#ffec99', meaning: 'Storage/Databases' },
      { color: '#b2f2bb', meaning: 'Caching layer' },
      { color: '#e599f7', meaning: 'Message queues' },
    ],
  },
  aiInstructions:
    'Consider scalability, availability, and consistency trade-offs. Suggest improvements for handling high load.',
  responseStyle: 'technical',
}

/**
 * Database Schema template
 */
const databaseSchemaTemplate: CanvasContextTemplate = {
  domain: 'database-schema',
  defaultTitle: 'Database Schema',
  defaultDescription: 'Entity-relationship diagram for database design',
  conventions: [
    'Tables represented as rectangles with columns',
    'Primary keys marked with PK',
    'Foreign keys marked with FK',
    'Relationships shown with crow\'s foot notation',
    'Cardinality indicated on relationships',
  ],
  terminology: [
    { term: 'Entity', definition: 'A table representing a real-world object' },
    { term: 'Attribute', definition: 'A column/field in a table' },
    { term: 'Primary Key', definition: 'Unique identifier for each row' },
    { term: 'Foreign Key', definition: 'Reference to another table\'s primary key' },
    { term: 'Index', definition: 'Data structure for faster queries' },
  ],
  styleGuide: {
    nodeNamingConvention: 'snake_case',
    connectionLabeling: 'relationship type (1:1, 1:N, N:M)',
    colorMeanings: [
      { color: '#a5d8ff', meaning: 'Core entities' },
      { color: '#b2f2bb', meaning: 'Junction/linking tables' },
      { color: '#ffec99', meaning: 'Lookup/reference tables' },
    ],
  },
  aiInstructions:
    'Suggest normalization improvements and indexing strategies. Consider query patterns when designing.',
  responseStyle: 'technical',
}

/**
 * Network Diagram template
 */
const networkDiagramTemplate: CanvasContextTemplate = {
  domain: 'network-diagram',
  defaultTitle: 'Network Diagram',
  defaultDescription: 'Network topology and infrastructure layout',
  conventions: [
    'Routers shown as circles with arrows',
    'Switches shown as rectangles',
    'Servers shown as tower/rack icons',
    'Cloud services shown with cloud shapes',
    'Firewalls indicated with wall icons',
  ],
  terminology: [
    { term: 'Router', definition: 'Device that forwards packets between networks' },
    { term: 'Switch', definition: 'Device that connects devices within a network' },
    { term: 'Firewall', definition: 'Security device filtering network traffic' },
    { term: 'VLAN', definition: 'Virtual LAN for network segmentation' },
    { term: 'Subnet', definition: 'Logical subdivision of an IP network' },
  ],
  styleGuide: {
    nodeNamingConvention: 'UPPERCASE',
    connectionLabeling: 'bandwidth and protocol',
    colorMeanings: [
      { color: '#a5d8ff', meaning: 'Internal network' },
      { color: '#ffc9c9', meaning: 'DMZ/External facing' },
      { color: '#b2f2bb', meaning: 'Secure/Internal only' },
    ],
  },
  aiInstructions:
    'Consider security zones and traffic flow. Suggest redundancy and failover paths.',
  responseStyle: 'technical',
}

/**
 * UML Diagram template
 */
const umlTemplate: CanvasContextTemplate = {
  domain: 'uml',
  defaultTitle: 'UML Diagram',
  defaultDescription: 'Unified Modeling Language diagram for software modeling',
  conventions: [
    'Classes shown with three-compartment boxes',
    'Interfaces marked with <<interface>>',
    'Inheritance uses hollow arrows',
    'Composition uses filled diamonds',
    'Aggregation uses hollow diamonds',
  ],
  terminology: [
    { term: 'Class', definition: 'Blueprint for objects with attributes and methods' },
    { term: 'Interface', definition: 'Contract defining method signatures' },
    { term: 'Inheritance', definition: 'Is-a relationship between classes' },
    { term: 'Composition', definition: 'Strong has-a relationship (lifecycle dependency)' },
    { term: 'Aggregation', definition: 'Weak has-a relationship (no lifecycle dependency)' },
  ],
  styleGuide: {
    nodeNamingConvention: 'PascalCase',
    connectionLabeling: 'relationship type and multiplicity',
    colorMeanings: [
      { color: '#a5d8ff', meaning: 'Concrete classes' },
      { color: '#e599f7', meaning: 'Abstract classes' },
      { color: '#b2f2bb', meaning: 'Interfaces' },
    ],
  },
  aiInstructions:
    'Follow UML 2.0 standards. Suggest design patterns where applicable.',
  responseStyle: 'technical',
}

/**
 * Wireframe template
 */
const wireframeTemplate: CanvasContextTemplate = {
  domain: 'wireframe',
  defaultTitle: 'UI Wireframe',
  defaultDescription: 'Low-fidelity user interface layout',
  conventions: [
    'Use simple shapes for UI elements',
    'Indicate clickable areas',
    'Show content hierarchy',
    'Use placeholder text for content',
    'Annotate interactions and navigation',
  ],
  terminology: [
    { term: 'Header', definition: 'Top section with navigation/branding' },
    { term: 'Hero', definition: 'Prominent section highlighting key content' },
    { term: 'CTA', definition: 'Call-to-action button or link' },
    { term: 'Modal', definition: 'Overlay dialog for focused interaction' },
    { term: 'Breadcrumb', definition: 'Navigation showing current location' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'user actions (click, hover, scroll)',
    colorMeanings: [
      { color: '#e9ecef', meaning: 'Content placeholders' },
      { color: '#a5d8ff', meaning: 'Interactive elements' },
      { color: '#ffec99', meaning: 'Highlighted/important areas' },
    ],
  },
  aiInstructions:
    'Focus on usability and information hierarchy. Suggest accessibility improvements.',
  responseStyle: 'beginner-friendly',
}

/**
 * Organization Chart template
 */
const orgChartTemplate: CanvasContextTemplate = {
  domain: 'org-chart',
  defaultTitle: 'Organization Chart',
  defaultDescription: 'Hierarchical structure of an organization',
  conventions: [
    'Positions shown in rectangles',
    'Vertical lines show reporting structure',
    'Same level = same organizational tier',
    'Include role titles and optionally names',
    'Departments can be color-coded',
  ],
  terminology: [
    { term: 'Direct Report', definition: 'Employee reporting directly to a manager' },
    { term: 'Span of Control', definition: 'Number of direct reports a manager has' },
    { term: 'Chain of Command', definition: 'Hierarchical line of authority' },
    { term: 'Matrix Structure', definition: 'Dual reporting relationships' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'reporting relationship type',
    colorMeanings: [
      { color: '#ffec99', meaning: 'Executive level' },
      { color: '#a5d8ff', meaning: 'Management level' },
      { color: '#b2f2bb', meaning: 'Staff level' },
    ],
  },
  aiInstructions:
    'Maintain clear hierarchy. Suggest improvements for span of control and communication paths.',
  responseStyle: 'concise',
}

/**
 * Process Flow template
 */
const processFlowTemplate: CanvasContextTemplate = {
  domain: 'process-flow',
  defaultTitle: 'Process Flow',
  defaultDescription: 'Business process or workflow visualization',
  conventions: [
    'Swim lanes for different actors/departments',
    'Activities in rectangles',
    'Gateways for decision points',
    'Events shown with circles',
    'Data objects shown with document icons',
  ],
  terminology: [
    { term: 'Activity', definition: 'A task or work performed in the process' },
    { term: 'Gateway', definition: 'Decision or branching point' },
    { term: 'Event', definition: 'Something that happens (trigger or result)' },
    { term: 'Swim Lane', definition: 'Horizontal band showing responsibility' },
    { term: 'Artifact', definition: 'Data or document used in the process' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'sequence or condition',
    colorMeanings: [
      { color: '#b2f2bb', meaning: 'Start/End events' },
      { color: '#a5d8ff', meaning: 'User tasks' },
      { color: '#ffec99', meaning: 'System tasks' },
      { color: '#e599f7', meaning: 'Gateways' },
    ],
  },
  aiInstructions:
    'Identify bottlenecks and optimization opportunities. Suggest automation possibilities.',
  responseStyle: 'detailed',
}

/**
 * Brainstorm template
 */
const brainstormTemplate: CanvasContextTemplate = {
  domain: 'brainstorm',
  defaultTitle: 'Brainstorm Session',
  defaultDescription: 'Free-form idea generation and exploration',
  conventions: [
    'All ideas are valid initially',
    'Group related ideas together',
    'Use colors to categorize',
    'Connect related concepts',
    'Mark promising ideas for follow-up',
  ],
  terminology: [
    { term: 'Idea', definition: 'A concept or suggestion to explore' },
    { term: 'Theme', definition: 'A category grouping related ideas' },
    { term: 'Connection', definition: 'Relationship between ideas' },
    { term: 'Priority', definition: 'Importance ranking of an idea' },
  ],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'relationship type',
    colorMeanings: [
      { color: '#ffec99', meaning: 'High priority ideas' },
      { color: '#a5d8ff', meaning: 'To explore further' },
      { color: '#b2f2bb', meaning: 'Validated/approved' },
      { color: '#ffc9c9', meaning: 'Challenges/concerns' },
    ],
  },
  aiInstructions:
    'Encourage creative thinking. Suggest unexpected connections and alternative perspectives.',
  responseStyle: 'beginner-friendly',
}

/**
 * General purpose template
 */
const generalTemplate: CanvasContextTemplate = {
  domain: 'general',
  defaultTitle: 'Diagram',
  defaultDescription: 'General purpose diagram',
  conventions: [
    'Use clear, descriptive labels',
    'Maintain consistent spacing',
    'Group related elements',
    'Use arrows for relationships',
  ],
  terminology: [],
  styleGuide: {
    nodeNamingConvention: 'sentence-case',
    connectionLabeling: 'relationship description',
    colorMeanings: [],
  },
  aiInstructions: 'Provide helpful suggestions based on the diagram content.',
  responseStyle: 'concise',
}

/**
 * Custom domain template (minimal defaults)
 */
const customTemplate: CanvasContextTemplate = {
  domain: 'custom',
  defaultTitle: 'Custom Diagram',
  defaultDescription: '',
  conventions: [],
  terminology: [],
  styleGuide: {},
  aiInstructions: '',
  responseStyle: 'concise',
}

/**
 * All templates indexed by domain
 */
export const CANVAS_CONTEXT_TEMPLATES: Record<CanvasDomain, CanvasContextTemplate> = {
  'software-architecture': softwareArchitectureTemplate,
  'flowchart': flowchartTemplate,
  'mindmap': mindmapTemplate,
  'system-design': systemDesignTemplate,
  'database-schema': databaseSchemaTemplate,
  'network-diagram': networkDiagramTemplate,
  'uml': umlTemplate,
  'wireframe': wireframeTemplate,
  'org-chart': orgChartTemplate,
  'process-flow': processFlowTemplate,
  'brainstorm': brainstormTemplate,
  'general': generalTemplate,
  'custom': customTemplate,
}

/**
 * Get a template for a specific domain
 */
export function getTemplateForDomain(domain: CanvasDomain): CanvasContextTemplate {
  return CANVAS_CONTEXT_TEMPLATES[domain]
}

/**
 * Create a new canvas context from a template
 */
export function createContextFromTemplate(domain: CanvasDomain): CanvasContext {
  const template = getTemplateForDomain(domain)
  const now = Date.now()

  return {
    title: template.defaultTitle,
    description: template.defaultDescription,
    domain: template.domain,
    conventions: [...template.conventions],
    terminology: template.terminology.map((t) => ({ ...t })),
    styleGuide: template.styleGuide ? { ...template.styleGuide } : undefined,
    aiInstructions: template.aiInstructions,
    responseStyle: template.responseStyle,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Apply a template to an existing context (merges conventions and terminology)
 */
export function applyTemplateToContext(
  context: CanvasContext,
  domain: CanvasDomain
): CanvasContext {
  const template = getTemplateForDomain(domain)

  return {
    ...context,
    domain,
    conventions: [...new Set([...context.conventions, ...template.conventions])],
    terminology: mergeTerminology(context.terminology, template.terminology),
    styleGuide: template.styleGuide
      ? { ...context.styleGuide, ...template.styleGuide }
      : context.styleGuide,
    aiInstructions: template.aiInstructions || context.aiInstructions,
    responseStyle: template.responseStyle,
    updatedAt: Date.now(),
  }
}

/**
 * Merge terminology entries, avoiding duplicates by term
 */
function mergeTerminology(
  existing: TerminologyEntry[],
  template: TerminologyEntry[]
): TerminologyEntry[] {
  const merged = [...existing]
  const existingTerms = new Set(existing.map((t) => t.term.toLowerCase()))

  for (const entry of template) {
    if (!existingTerms.has(entry.term.toLowerCase())) {
      merged.push({ ...entry })
    }
  }

  return merged
}
