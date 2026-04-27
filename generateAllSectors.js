// Parses raw-sectors-*.txt and generates all 162 sector templates
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

// Common workflow templates by business type
const WORKFLOW_PRESETS = {
  service: [
    { name: 'New Lead → Qualify → Follow Up', trigger_type: 'lead_in', steps: [
      { type: 'integration', name: 'Welcome Email', integration_id: 'email_lead_welcome', args: { email: '{{email}}', name: '{{name}}', sector: '{{sector}}' } },
      { type: 'integration', name: 'WhatsApp Follow-up', integration_id: 'whatsapp_lead_followup', args: { phone: '{{phone}}', name: '{{name}}', context: 'Thank you for your interest! Our team will reach out shortly.' } },
      { type: 'update_lead', name: 'Mark Contacted', status: 'contacted' }
    ]},
    { name: 'Deal Stage Update → Notify', trigger_type: 'deal_update', steps: [
      { type: 'integration', name: 'Notify via WhatsApp', integration_id: 'whatsapp_send', args: { to: '{{phone}}', message: 'Update on your inquiry: Stage moved to {{stage}}. We will keep you posted!' } }
    ]},
    { name: 'Weekly Performance Report', trigger_type: 'scheduled', steps: [
      { type: 'integration', name: 'Send Report', integration_id: 'email_send', args: { to: '{{ownerEmail}}', subject: '📊 Weekly Report', html: '<h1>Weekly Summary</h1><p>Leads: {{totalLeads}}, Deals: {{totalDeals}}</p>' } }
    ]}
  ],
  product: [
    { name: 'New Lead → Qualify → Convert', trigger_type: 'lead_in', steps: [
      { type: 'integration', name: 'Welcome Email', integration_id: 'email_lead_welcome', args: { email: '{{email}}', name: '{{name}}', sector: '{{sector}}' } },
      { type: 'integration', name: 'WhatsApp Intro', integration_id: 'whatsapp_lead_followup', args: { phone: '{{phone}}', name: '{{name}}', context: 'We have solutions tailored for your needs. Let us schedule a demo.' } },
      { type: 'update_lead', name: 'Mark Contacted', status: 'contacted' }
    ]},
    { name: 'Hot Lead Alert', trigger_type: 'lead_in', trigger_config: { conditions: [{ field: 'score', operator: 'gt', value: 70 }] }, steps: [
      { type: 'integration', name: 'Alert Owner', integration_id: 'whatsapp_send', args: { to: '{{ownerPhone}}', message: '🔥 HOT LEAD: {{name}} (Score: {{score}})' } },
      { type: 'create_task', name: 'Urgent Follow-up', title: 'Call hot lead: {{name}}', priority: 1.0 }
    ]},
    { name: 'Monthly Report', trigger_type: 'scheduled', steps: [
      { type: 'integration', name: 'Send Report', integration_id: 'email_send', args: { to: '{{ownerEmail}}', subject: '📊 Monthly Report', html: '<h1>Monthly Summary</h1>' } }
    ]}
  ]
};

// Pipeline presets
const PIPELINE_PRESETS = {
  service: { name: 'Client Pipeline', stages: ['New Inquiry','Contacted','Qualified','Proposal','Negotiation','Onboarding','Active Client'] },
  product: { name: 'Sales Pipeline', stages: ['Lead','Discovery','Demo','Proposal','Negotiation','Closed Won','Closed Lost'] },
  b2b: { name: 'B2B Pipeline', stages: ['Prospecting','Qualification','Needs Analysis','Proposal','Negotiation','Closing','Delivery'] }
};

// Capability sets by agent role keywords
function getCapabilities(role) {
  const r = role.toLowerCase();
  const caps = [];
  if (r.includes('sales') || r.includes('crm') || r.includes('lead') || r.includes('client') || r.includes('retention') || r.includes('onboard'))
    caps.push('whatsapp_lead_followup', 'email_lead_welcome', 'whatsapp_send');
  if (r.includes('billing') || r.includes('payment') || r.includes('finance') || r.includes('pricing'))
    caps.push('payment_create_link', 'whatsapp_payment_confirm');
  if (r.includes('booking') || r.includes('appointment') || r.includes('scheduling') || r.includes('visit'))
    caps.push('booking_create', 'booking_upcoming', 'whatsapp_booking_reminder');
  if (r.includes('marketing') || r.includes('ads') || r.includes('content') || r.includes('brand') || r.includes('seo') || r.includes('social'))
    caps.push('email_send');
  if (r.includes('support') || r.includes('compliance') || r.includes('reporting') || r.includes('audit'))
    caps.push('email_send');
  if (caps.length === 0) caps.push('email_send');
  return [...new Set(caps)];
}

function agentType(role) {
  const r = role.toLowerCase();
  if (r.includes('lead') || r.includes('sales') || r.includes('crm')) return 'lead_capture';
  if (r.includes('booking') || r.includes('appointment') || r.includes('scheduling')) return 'scheduler';
  if (r.includes('billing') || r.includes('payment') || r.includes('finance')) return 'closer';
  if (r.includes('marketing') || r.includes('ads') || r.includes('content') || r.includes('brand')) return 'content';
  if (r.includes('analytics') || r.includes('reporting') || r.includes('data')) return 'analytics';
  if (r.includes('compliance') || r.includes('legal') || r.includes('audit')) return 'compliance';
  if (r.includes('support') || r.includes('service')) return 'support';
  if (r.includes('hr') || r.includes('hiring') || r.includes('recruit')) return 'hr';
  if (r.includes('ops') || r.includes('manager') || r.includes('head') || r.includes('director')) return 'operations';
  if (r.includes('engineer') || r.includes('dev') || r.includes('tech') || r.includes('architect')) return 'technical';
  return 'automation';
}

function classifySector(name) {
  const n = name.toLowerCase();
  if (n.includes('consult') || n.includes('service') || n.includes('agency') || n.includes('firm') || n.includes('salon') || n.includes('clinic'))
    return 'service';
  if (n.includes('manufactur') || n.includes('product') || n.includes('hardware') || n.includes('pharma') || n.includes('fmcg'))
    return 'product';
  return 'service';
}

// Parse raw sector files
function parseRawSectors() {
  const sectors = [];
  for (const file of ['raw-sectors-1.txt', 'raw-sectors-2.txt', 'raw-sectors-3.txt']) {
    const content = readFileSync(join(root, file), 'utf-8');
    const lines = content.split('\n');
    let current = null;

    for (const line of lines) {
      const headerMatch = line.match(/^###\s*(\d+)\.\s*(.+)$/);
      if (headerMatch) {
        if (current) sectors.push(current);
        const num = parseInt(headerMatch[1]);
        const name = headerMatch[2].trim();
        current = { num, name, agents: [] };
        continue;
      }

      const agentLineCSV = line.match(/^Agents:\s*\d+$/);
      if (agentLineCSV) continue;

      // CSV agent list (file 1 style)
      if (current && !line.startsWith('*') && !line.startsWith('#') && line.includes(',') && line.trim().length > 5) {
        current.agents = line.split(',').map(a => a.trim()).filter(Boolean);
        continue;
      }

      // Bullet agent list (file 2/3 style)
      const bulletMatch = line.match(/^\*\s*(.+)$/);
      if (bulletMatch && current) {
        current.agents.push(bulletMatch[1].trim());
      }
    }
    if (current) sectors.push(current);
  }
  return sectors;
}

export function generateAllSectorTemplates() {
  const rawSectors = parseRawSectors();
  const templates = {};

  for (const raw of rawSectors) {
    const sectorKey = raw.name.toLowerCase()
      .replace(/[&\/\s–-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const bizType = classifySector(raw.name);
    const pipelinePreset = bizType === 'product' ? PIPELINE_PRESETS.product : PIPELINE_PRESETS.service;
    const workflowPreset = WORKFLOW_PRESETS[bizType] || WORKFLOW_PRESETS.service;

    // Build agents (cap at 8 for efficiency, pick key roles)
    const agentDefs = raw.agents.slice(0, 8).map(role => ({
      name: role,
      type: agentType(role),
      systemPrompt: `You are the ${role} agent for a ${raw.name} organization. You execute tasks autonomously, use available tools, and report results. Be decisive and action-oriented.`,
      capabilities: getCapabilities(role)
    }));

    templates[sectorKey] = {
      sector: sectorKey,
      name: raw.name,
      description: `AI-powered automation for ${raw.name}. ${agentDefs.length} specialized agents with CRM, workflows, and integrations.`,
      agents: agentDefs,
      workflows: workflowPreset.map(w => ({
        ...w,
        trigger_config: w.trigger_config || { conditions: [] }
      })),
      pipelines: [{ name: pipelinePreset.name, stages: pipelinePreset.stages.map((s, i) => ({ name: s, order: i })) }]
    };
  }

  return templates;
}

// If run directly, print stats
if (process.argv[1]?.includes('generateAllSectors')) {
  const t = generateAllSectorTemplates();
  const keys = Object.keys(t);
  console.log(`\n✅ Generated ${keys.length} sector templates\n`);
  keys.forEach((k, i) => {
    console.log(`  ${String(i+1).padStart(3)}. ${t[k].name} → ${t[k].agents.length} agents, ${t[k].workflows.length} workflows`);
  });
  console.log(`\nTotal agents across all sectors: ${keys.reduce((sum, k) => sum + t[k].agents.length, 0)}`);
}
