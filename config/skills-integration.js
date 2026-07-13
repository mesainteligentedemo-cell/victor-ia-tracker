/**
 * Skills Integration Configuration for Victor IA Tracker
 * Version: 1.0.0
 * Updated: 2026-07-12
 *
 * This config integrates the 155-skills audit with the tracker UI
 * Auto-loads skills recommendations when creating/editing tasks
 */

const SKILLS_CONFIG = {
  // API endpoint for skills manifest
  apiEndpoint: '/api/skills-manifest.json',

  // Cache settings
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour in milliseconds
    key: 'victor_ia_skills_manifest'
  },

  // Auto-suggestion when user types keywords
  autoSuggest: {
    enabled: true,
    minCharsBeforeSuggest: 3,
    maxSuggestions: 3,
    debounceMs: 300
  },

  // Skills by category for quick access
  categories: {
    video: ['motion-design', 'higgsfield-content-factory', 'hyperframes-render', 'remotion-victor'],
    web: ['web-4o', 'website-replica', 'vercel-deploy-perfecto', 'web-assets-deploy'],
    seo: ['content-audit-seo', 'keyword-research-ai', 'backlink-analyzer', 'schema-markup-generator'],
    analytics: ['analytics-dashboard-builder', 'ga4-connector', 'looker-studio-builder', 'a-b-testing-framework'],
    automation: ['n8n-ia-local', 'web-scrape-complete', 'rpa-workflow-builder'],
    design: ['design-system-builder', 'figma-use', 'curador-apps-saas', 'pixel-perfecto'],
    audio: ['elevenlabs-api', 'elevenlabs-music-gen', 'podcast-production', 'voice-cloning-local']
  },

  // Trigger keywords mapping to skills
  triggerMap: {
    // Video
    'crea video': ['motion-design', 'higgsfield-content-factory'],
    'sube video': ['cloudinary-cdn-media', 'web-assets-deploy'],
    'spot comercial': ['motion-design'],
    'video comercial': ['motion-design'],

    // Web
    'diseña sitio': ['web-4o'],
    'crea landing': ['web-4o', 'copy-web-pnl'],
    'landing page': ['web-4o'],
    'web 4.0': ['web-4o'],

    // SEO
    'audita SEO': ['content-audit-seo'],
    'rankings': ['content-audit-seo'],
    'Core Web Vitals': ['content-audit-seo'],
    'posicionamiento': ['content-audit-seo'],

    // Analytics
    'crea dashboard': ['analytics-dashboard-builder'],
    'métricas en vivo': ['analytics-dashboard-builder'],
    'KPI': ['analytics-dashboard-builder'],
    'retention': ['analytics-dashboard-builder'],

    // Deployment
    'sube fotos': ['cloudinary-cdn-media', 'web-assets-deploy', 'vercel-deploy-perfecto'],
    'deploy': ['vercel-deploy-perfecto'],
    'publica': ['vercel-deploy-perfecto'],

    // Design System
    'design system': ['design-system-builder'],
    'tokens CSS': ['design-system-builder'],
    'Storybook': ['design-system-builder'],

    // Automation
    'automatiza': ['n8n-ia-local'],
    'workflow': ['n8n-ia-local'],
    'scrape': ['web-scrape-complete']
  },

  // Orchestrator skills (automatically invoke sub-skills)
  orchestrators: {
    'web-4o': {
      subSkills: ['copy-web-pnl', 'svg-motion', 'pixel-perfecto'],
      order: ['copy-web-pnl', 'svg-motion', 'web-4o', 'vercel-deploy-perfecto'],
      description: 'Web 4.0 luxury design (auto-includes copy + animations + polish)'
    },
    'motion-design': {
      subSkills: ['higgsfield-supercomputer', 'elevenlabs-voice', 'remotion-victor'],
      order: ['higgsfield-supercomputer', 'elevenlabs-voice', 'motion-design'],
      description: 'Cinematic video design (auto-includes image gen + voice + sync)'
    },
    'higgsfield-content-factory': {
      subSkills: ['higgsfield-supercomputer', 'remotion', 'hyperframes', 'elevenlabs'],
      order: ['higgsfield-supercomputer', 'remotion', 'higgsfield-content-factory'],
      description: 'Multimodal content generation (image/video/audio)'
    },
    'cloudinary-cdn-media': {
      subSkills: [],
      order: ['cloudinary-cdn-media', 'web-assets-deploy', 'vercel-deploy-perfecto'],
      description: 'Media upload to CDN (always followed by web-assets-deploy + vercel)'
    },
    'vercel-deploy-perfecto': {
      subSkills: ['web-assets-deploy'],
      order: ['web-assets-deploy', 'vercel-deploy-perfecto'],
      description: 'Deploy to Vercel (auto-includes assets integration)'
    }
  },

  // Skills that should NEVER be invoked directly (only via orchestrator)
  subSkillsOnly: [
    'copy-web-pnl',
    'pixel-perfecto',
    'svg-motion',
    'elevenlabs-voice',
    'remotion-victor',
    'hyperframes-render',
    'web-assets-deploy',
    'skill-testing'
  ],

  // Suggested workflow when user types task description
  workflows: {
    'photos upload': {
      steps: [
        { skill: 'cloudinary-cdn-media', action: 'upload to CDN' },
        { skill: 'web-assets-deploy', action: 'integrate in React' },
        { skill: 'vercel-deploy-perfecto', action: 'publish to Vercel' }
      ],
      description: '3-step media workflow'
    },
    'website design': {
      steps: [
        { skill: 'copy-web-pnl', action: 'persuasive copy' },
        { skill: 'web-4o', action: 'design + code' },
        { skill: 'vercel-deploy-perfecto', action: 'deploy' }
      ],
      description: 'Web design workflow (copy → design → deploy)'
    },
    'SEO audit': {
      steps: [
        { skill: 'content-audit-seo', action: '9D audit + roadmap' },
        { skill: 'page-speed-optimizer', action: 'Core Web Vitals' },
        { skill: 'internal-linking-builder', action: 'link strategy' }
      ],
      description: 'SEO optimization workflow'
    },
    'analytics dashboard': {
      steps: [
        { skill: 'ga4-connector', action: 'connect GA4' },
        { skill: 'analytics-dashboard-builder', action: 'build dashboard' },
        { skill: 'vercel-deploy-perfecto', action: 'deploy' }
      ],
      description: 'Analytics dashboard workflow'
    },
    'video production': {
      steps: [
        { skill: 'higgsfield-supercomputer', action: 'generate assets' },
        { skill: 'motion-design', action: 'create video' },
        { skill: 'vercel-deploy-perfecto', action: 'publish' }
      ],
      description: 'Video production workflow'
    }
  },

  // Skills by status (for filtering/sorting in UI)
  skillsByStatus: {
    functioning: 107,
    ambiguous: 31,
    dead: 10,
    duplicate: 7
  },

  // New skills (added 2026-07-12)
  newSkills: [
    'content-audit-seo',
    'design-system-builder',
    'analytics-dashboard-builder'
  ],

  // Consolidations (for documentation/help)
  consolidations: {
    'cloudinary-cdn-media': {
      oldName: 'perfect-media-deployment',
      reason: 'Clarity: CDN media upload (vs web-assets-deploy for React integration)',
      documentation: '~/.claude/projects/c--Users-inbou/memory/skills_deployment_consolidation.md'
    }
  },

  // Help text for users
  helpTexts: {
    orchestrators: 'These skills automatically invoke other skills. Do not invoke sub-skills separately.',
    subSkillsOnly: 'These skills should only be used via their parent orchestrator.',
    triggers: 'Type any of these keywords to get skill suggestions automatically.',
    workflow: 'Pre-defined workflows for common tasks. Click to apply all steps at once.',
    newSkills: 'These 3 skills were added 2026-07-12. Check the audit for details.'
  },

  // Document references
  documentation: {
    masterMatrix: '~/.claude/projects/c--Users-inbou/memory/skills_master_matrix_155.md',
    deploymentFlow: '~/.claude/projects/c--Users-inbou/memory/skills_deployment_consolidation.md',
    claudemdArchitecture: '~/.claude/CLAUDE.md (line 310+ SKILL ARCHITECTURE)',
    quickAccess: '~/.claude/proyectos/ACCESO-RAPIDO-SKILLS.md',
    auditEntry: '~/victor-ia-tracker/AUDIT-SKILLS-155-2026-07-12.md'
  },

  // Functions for tracker UI integration

  /**
   * Get skill recommendations based on user input
   * @param {string} input - User's task description
   * @returns {Array} Suggested skills
   */
  suggestSkills: function(input) {
    const lowerInput = input.toLowerCase();
    const suggestions = new Set();

    // Check trigger map
    for (const [trigger, skills] of Object.entries(this.triggerMap)) {
      if (lowerInput.includes(trigger)) {
        skills.forEach(s => suggestions.add(s));
      }
    }

    return Array.from(suggestions).slice(0, 3);
  },

  /**
   * Get full workflow for a task type
   * @param {string} taskType - Type of task
   * @returns {Object} Workflow steps
   */
  getWorkflow: function(taskType) {
    const lowerType = taskType.toLowerCase();
    for (const [key, workflow] of Object.entries(this.workflows)) {
      if (lowerType.includes(key)) {
        return workflow;
      }
    }
    return null;
  },

  /**
   * Check if a skill is an orchestrator
   * @param {string} skillId - Skill ID
   * @returns {boolean}
   */
  isOrchestrator: function(skillId) {
    return skillId in this.orchestrators;
  },

  /**
   * Check if a skill is sub-skills-only
   * @param {string} skillId - Skill ID
   * @returns {boolean}
   */
  isSubSkillOnly: function(skillId) {
    return this.subSkillsOnly.includes(skillId);
  },

  /**
   * Get ordered workflow for orchestrator
   * @param {string} orchestratorId - Orchestrator skill ID
   * @returns {Array} Ordered skills to invoke
   */
  getOrchestratorWorkflow: function(orchestratorId) {
    if (this.orchestrators[orchestratorId]) {
      return this.orchestrators[orchestratorId].order;
    }
    return null;
  }
};

// Export for use in tracker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SKILLS_CONFIG;
}

// Also make available globally for frontend
if (typeof window !== 'undefined') {
  window.SKILLS_CONFIG = SKILLS_CONFIG;
}
