/**
 * ==========================================
 * API DATA COLLECTORS
 * ==========================================
 * Recopila datos reales del sistema Victor IA
 * para los 4 dashboards
 */

// ==========================================
// 1. LOOP DATA COLLECTOR
// ==========================================
async function getLoopsData() {
  try {
    // Opción A: Desde localStorage (datos guardados por /loop)
    const loopsStorage = localStorage.getItem('via_loops_history');
    if (loopsStorage) {
      try {
        const loops = JSON.parse(loopsStorage);
        return {
          active: loops.filter(l => l.status === 'active'),
          all: loops,
          stats: {
            totalAttempts: loops.reduce((sum, l) => sum + (l.attempts || 0), 0),
            successCount: loops.reduce((sum, l) => sum + (l.success || 0), 0),
            failureCount: loops.reduce((sum, l) => sum + (l.failures || 0), 0),
            avgUptime: (loops.reduce((sum, l) => {
              const match = (l.uptime || '0%').match(/(\d+\.?\d*)/);
              return sum + (match ? parseFloat(match[0]) : 0);
            }, 0) / loops.length).toFixed(1)
          }
        };
      } catch (e) {
        console.warn('[Loops] Error parsing localStorage:', e);
      }
    }

    // Opción B: Llamar a API real (cuando esté lista)
    // const res = await fetch('/api/loops/active');
    // return await res.json();

    // Fallback: datos demo
    return {
      active: [
        { id: 'loop-1', name: 'blog-daily-master', status: 'active', lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString(), uptime: '99.7%', attempts: 47, success: 46, failures: 1, avgDuration: 12400 },
        { id: 'loop-2', name: 'tracker-sync', status: 'active', lastRun: new Date(Date.now() - 900000).toISOString(), nextRun: new Date(Date.now() + 900000).toISOString(), uptime: '100%', attempts: 320, success: 320, failures: 0, avgDuration: 4200 },
      ],
      all: [
        { id: 'loop-1', name: 'blog-daily-master', status: 'active', lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString(), uptime: '99.7%', attempts: 47, success: 46, failures: 1, avgDuration: 12400 },
        { id: 'loop-2', name: 'tracker-sync', status: 'active', lastRun: new Date(Date.now() - 900000).toISOString(), nextRun: new Date(Date.now() + 900000).toISOString(), uptime: '100%', attempts: 320, success: 320, failures: 0, avgDuration: 4200 },
        { id: 'loop-3', name: 'graphify-maintenance', status: 'idle', lastRun: new Date(Date.now() - 172800000).toISOString(), nextRun: new Date(Date.now() + 604800000).toISOString(), uptime: '99.2%', attempts: 12, success: 11, failures: 1, avgDuration: 28500 },
      ],
      stats: {
        totalAttempts: 379,
        successCount: 377,
        failureCount: 2,
        avgUptime: '99.6'
      }
    };
  } catch (err) {
    console.error('[Loops] Error:', err);
    return { active: [], all: [], stats: { totalAttempts: 0, successCount: 0, failureCount: 0, avgUptime: '0' } };
  }
}

// ==========================================
// 2. CONTEXT DATA COLLECTOR
// ==========================================
async function getContextData() {
  try {
    // Opción A: Desde sessionStorage (tracking en vivo)
    const contextStorage = sessionStorage.getItem('via_context_metrics');
    if (contextStorage) {
      try {
        const ctx = JSON.parse(contextStorage);
        return ctx;
      } catch (e) {
        console.warn('[Context] Error parsing sessionStorage:', e);
      }
    }

    // Opción B: Calcular desde datos disponibles
    const tokensUsed = parseInt(sessionStorage.getItem('via_tokens_used') || '145230');
    const tokenBudget = 200000;
    const activeSessions = parseInt(sessionStorage.getItem('via_active_sessions') || '3');
    const memoryBlocks = parseInt(sessionStorage.getItem('via_memory_blocks') || '24');

    return {
      tokensUsed,
      tokenBudget,
      percentUsed: (tokensUsed / tokenBudget * 100).toFixed(1),
      budgetRemaining: tokenBudget - tokensUsed,
      activeSessions,
      memoryBlocks,
      compressionScore: 'A+',
      historicalData: {
        day1: 120450,
        day7: 145230,
        day30: 185672
      }
    };
  } catch (err) {
    console.error('[Context] Error:', err);
    return { tokensUsed: 0, tokenBudget: 200000, percentUsed: '0', budgetRemaining: 200000, activeSessions: 0, memoryBlocks: 0 };
  }
}

// ==========================================
// 3. PROJECT METRICS COLLECTOR
// ==========================================
async function getProjectMetrics() {
  try {
    // Opción A: Desde localStorage (si existe projectsData)
    const projectsStorage = localStorage.getItem('via_projects_metrics');
    if (projectsStorage) {
      try {
        return JSON.parse(projectsStorage);
      } catch (e) {
        console.warn('[Projects] Error parsing localStorage:', e);
      }
    }

    // Opción B: Datos demo (en espera de integración real con clientes-activos.json)
    return {
      projectsCompleted: 12,
      projectsCompletedThisMonth: 3,
      skillsBuilt: 155,
      skillsBuiltThisYear: 30,
      clientsActive: 6,
      clientsPending: 2,
      deliverySpeedMultiplier: 3.2,
      clientList: [
        { name: 'Victor IA Website', status: 'active', progress: 95 },
        { name: 'Costa Negra', status: 'active', progress: 80 },
        { name: 'ROES & CO', status: 'active', progress: 60 },
        { name: 'Seabird Hotel', status: 'pending', progress: 20 },
        { name: 'LATIVA Video', status: 'completed', progress: 100 },
        { name: 'Brandbook', status: 'completed', progress: 100 },
      ]
    };
  } catch (err) {
    console.error('[Projects] Error:', err);
    return { projectsCompleted: 0, skillsBuilt: 0, clientsActive: 0, clientList: [] };
  }
}

// ==========================================
// 4. ROADMAP DATA COLLECTOR
// ==========================================
async function getRoadmapData() {
  try {
    const today = new Date();
    const q2End = new Date(2026, 5, 30); // June 30
    const q3End = new Date(2026, 8, 30); // Sept 30

    const phases = [
      {
        quarter: 'Q2 2026',
        status: 'completed',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        completion: 100,
        items: [
          '155 Skills Integration',
          'Deep Learning System',
          'Harness Engineering',
          'Multi-client Tracking'
        ]
      },
      {
        quarter: 'Q3 2026',
        status: today <= q3End ? 'in-progress' : 'completed',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        completion: 65,
        items: [
          'The Door (AI Layer) — In Progress',
          'Loop Dashboard — ✅ Done',
          'Context Compression — ✅ Done',
          'Public Roadmap — ✅ Done',
          'Real-time Metrics — Next'
        ]
      },
      {
        quarter: 'Q4 2026',
        status: 'planned',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        completion: 0,
        items: [
          'Customer Discovery Loop',
          'Beta Release Gate',
          'Advanced Metrics Dashboard',
          'Playbook Generator',
          'Scale Replicas System'
        ]
      }
    ];

    return { phases };
  } catch (err) {
    console.error('[Roadmap] Error:', err);
    return { phases: [] };
  }
}

// ==========================================
// 5. AI LAYER DATA COLLECTOR
// ==========================================
async function getAILayerData() {
  try {
    // Datos del sistema actual
    const claudemdStorage = localStorage.getItem('via_claudemd_stats');

    return {
      model: {
        name: 'Claude Haiku 4.5 (20251001)',
        context: '200k tokens',
        thinking: 'enabled (extended)',
        status: '✅ Active',
        lastUpdated: new Date().toISOString()
      },
      harness: {
        rules: 'CLAUDE.md (127+ rules)',
        memory: 'MEMORY.md (155+ skills indexed)',
        skills: '155 skills across 27 categories',
        mcps: '14 MCPs integrated',
        status: '✅ Active',
        lastUpdated: new Date().toISOString()
      },
      aiLayer: {
        rulesRegistry: 'Planned (Week 1 Q3)',
        skillsRouter: 'Planned (Week 2 Q3)',
        hooksRegistry: 'Planned (Week 3 Q3)',
        lspIntegration: 'Planned (Q4 2026)',
        status: '🟡 In Progress',
        completion: 15
      }
    };
  } catch (err) {
    console.error('[AILayer] Error:', err);
    return { model: {}, harness: {}, aiLayer: {} };
  }
}

// ==========================================
// UNIFIED COLLECTOR
// ==========================================
const DataCollectors = {
  loops: getLoopsData,
  context: getContextData,
  projects: getProjectMetrics,
  roadmap: getRoadmapData,
  aiLayer: getAILayerData,

  // Get all data at once
  async getAll() {
    return {
      loops: await getLoopsData(),
      context: await getContextData(),
      projects: await getProjectMetrics(),
      roadmap: await getRoadmapData(),
      aiLayer: await getAILayerData(),
      timestamp: new Date().toISOString()
    };
  }
};

// Export for use in dashboards
window.DataCollectors = DataCollectors;
console.log('[DATA COLLECTORS] Initialized and ready');