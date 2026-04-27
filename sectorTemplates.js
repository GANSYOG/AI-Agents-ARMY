// Sector Templates — ALL 162 sectors auto-generated + 3 premium hand-crafted
// Hand-crafted: yoga, real_estate, marketing (detailed integrations)
// Auto-generated: remaining 159 sectors from raw-sectors-*.txt

import { generateAllSectorTemplates } from './generateAllSectors.js';

// ========================================
// 3 PREMIUM HAND-CRAFTED TEMPLATES
// ========================================

const PREMIUM_TEMPLATES = {
  yoga_wellness: {
    sector: 'yoga_wellness',
    name: 'Yoga & Wellness',
    description: 'Complete automation for yoga studios: bookings, subscriptions, reminders, retention, and WhatsApp engagement.',
    agents: [
      { name: 'Booking Manager', type: 'booking', systemPrompt: 'You manage class bookings and schedules for a yoga studio. Create bookings, send confirmations, handle cancellations. Always be warm and use wellness language.', capabilities: ['booking_create', 'booking_cancel', 'booking_complete', 'booking_upcoming', 'whatsapp_booking_reminder'] },
      { name: 'Lead Nurturer', type: 'lead_capture', systemPrompt: 'You capture and qualify leads for the yoga studio. Assess interest level, preferred class types, and budget. Score leads 0-100.', capabilities: ['whatsapp_lead_followup', 'email_lead_welcome', 'whatsapp_send'] },
      { name: 'Revenue Agent', type: 'closer', systemPrompt: 'You handle payments, subscriptions, and upsells. Create payment links, manage renewals, sell premium packages.', capabilities: ['payment_create_link', 'payment_create_subscription', 'whatsapp_payment_confirm'] },
      { name: 'Retention Specialist', type: 'retention', systemPrompt: 'You retain existing students. Track attendance, send re-engagement messages, offer deals to at-risk members.', capabilities: ['whatsapp_send', 'email_send', 'booking_stats'] },
      { name: 'Content & Growth', type: 'content', systemPrompt: 'You create social media content, class descriptions, marketing copy. Focus on attracting new students through wellness messaging.', capabilities: ['email_send'] }
    ],
    workflows: [
      { name: 'New Lead → Qualify → Book Trial', trigger_type: 'lead_in', trigger_config: { conditions: [] }, steps: [
        { type: 'integration', name: 'Send Welcome Email', integration_id: 'email_lead_welcome', args: { email: '{{email}}', name: '{{name}}', sector: 'yoga' } },
        { type: 'integration', name: 'WhatsApp Follow-up', integration_id: 'whatsapp_lead_followup', args: { phone: '{{phone}}', name: '{{name}}', context: 'We offer a FREE trial class! Would you like to book one this week?' } },
        { type: 'update_lead', name: 'Mark Contacted', status: 'contacted' }
      ]},
      { name: 'Booking Reminder', trigger_type: 'booking', trigger_config: { conditions: [] }, steps: [
        { type: 'integration', name: 'Confirm via WhatsApp', integration_id: 'whatsapp_send', args: { to: '{{customerPhone}}', message: '✅ Booking confirmed! {{service}} on {{date}}. See you! 🧘' } }
      ]},
      { name: 'Monthly Renewal', trigger_type: 'scheduled', trigger_config: { cron: '0 9 1 * *' }, steps: [
        { type: 'integration', name: 'Payment Link', integration_id: 'payment_create_link', args: { amount: 2999, name: '{{name}}', email: '{{email}}', phone: '{{phone}}', description: 'Monthly Yoga Membership' } }
      ]}
    ],
    pipelines: [{ name: 'Student Journey', stages: [{ name: 'New Inquiry', order: 0 }, { name: 'Trial Booked', order: 1 }, { name: 'Trial Done', order: 2 }, { name: 'Package Selected', order: 3 }, { name: 'Paying Member', order: 4 }, { name: 'Loyal Member', order: 5 }] }]
  },

  real_estate: {
    sector: 'real_estate',
    name: 'Real Estate',
    description: 'End-to-end real estate: lead capture, buyer qualification, property matching, visit scheduling, deal closing.',
    agents: [
      { name: 'Lead Capturer', type: 'lead_capture', systemPrompt: 'Capture real estate leads. Collect budget, location, property type, timeline, financing status.', capabilities: ['whatsapp_lead_followup', 'email_lead_welcome', 'whatsapp_send'] },
      { name: 'Buyer Qualifier', type: 'qualifier', systemPrompt: 'Qualify buyers by budget, docs, loan approval, urgency. Score 0-100.', capabilities: ['whatsapp_send', 'email_send'] },
      { name: 'Visit Scheduler', type: 'scheduler', systemPrompt: 'Schedule property visits. Coordinate availability. Confirm 24h before.', capabilities: ['booking_create', 'booking_upcoming', 'whatsapp_booking_reminder', 'whatsapp_send'] },
      { name: 'Property Matcher', type: 'content', systemPrompt: 'Match buyers to properties. Send curated details with pricing and location.', capabilities: ['whatsapp_property_details', 'whatsapp_send', 'email_send'] },
      { name: 'Deal Closer', type: 'closer', systemPrompt: 'Handle negotiations, payment links, document checklists, closing.', capabilities: ['payment_create_link', 'whatsapp_payment_confirm', 'whatsapp_send', 'email_send'] }
    ],
    workflows: [
      { name: 'Lead → Qualify → Match', trigger_type: 'lead_in', trigger_config: { conditions: [] }, steps: [
        { type: 'integration', name: 'Welcome Email', integration_id: 'email_lead_welcome', args: { email: '{{email}}', name: '{{name}}', sector: 'real_estate' } },
        { type: 'integration', name: 'WhatsApp Intro', integration_id: 'whatsapp_lead_followup', args: { phone: '{{phone}}', name: '{{name}}', context: 'What type of property are you looking for? Share budget and location.' } },
        { type: 'update_lead', name: 'Mark Contacted', status: 'contacted' }
      ]},
      { name: 'Qualified → Schedule Visit', trigger_type: 'deal_update', trigger_config: { conditions: [{ field: 'stage', operator: 'equals', value: 'proposal' }] }, steps: [
        { type: 'integration', name: 'Property Details', integration_id: 'whatsapp_property_details', args: { phone: '{{phone}}', name: '{{buyerName}}', title: '{{propertyTitle}}', price: '{{price}}', location: '{{location}}' } }
      ]},
      { name: 'Stale Lead Reactivation', trigger_type: 'scheduled', trigger_config: { cron: '0 10 * * 1' }, steps: [
        { type: 'integration', name: 'Re-engage', integration_id: 'whatsapp_send', args: { to: '{{phone}}', message: 'Hi {{name}}, new properties matching your criteria! Want an updated list? 🏠' } }
      ]}
    ],
    pipelines: [{ name: 'Buyer Pipeline', stages: [{ name: 'New Inquiry', order: 0 }, { name: 'Qualified', order: 1 }, { name: 'Properties Shared', order: 2 }, { name: 'Visit Scheduled', order: 3 }, { name: 'Visit Done', order: 4 }, { name: 'Negotiation', order: 5 }, { name: 'Booking Paid', order: 6 }, { name: 'Closed', order: 7 }] }]
  },

  marketing_agencies: {
    sector: 'marketing_agencies',
    name: 'Marketing Agencies',
    description: 'Full-stack marketing: campaigns, lead gen, creatives, CRM, analytics.',
    agents: [
      { name: 'Campaign Manager', type: 'campaign', systemPrompt: 'Manage ad campaigns on Meta/Google. Set budgets, targeting, track CPL/CTR/ROAS.', capabilities: ['email_send'] },
      { name: 'Lead Generator', type: 'lead_capture', systemPrompt: 'Capture leads from ads, landing pages, referrals. Tag by source, score, route to follow-up.', capabilities: ['whatsapp_lead_followup', 'email_lead_welcome', 'whatsapp_send'] },
      { name: 'Creative Engine', type: 'content', systemPrompt: 'Generate ad creatives, social posts, marketing copy. Adapt tone per platform.', capabilities: ['email_send'] },
      { name: 'Follow-up Agent', type: 'follow_up', systemPrompt: 'Automated follow-up sequences. Timed messages, check responses, escalate hot leads.', capabilities: ['whatsapp_send', 'whatsapp_lead_followup', 'email_send'] },
      { name: 'Analytics Tracker', type: 'analytics', systemPrompt: 'Track CPL, conversion rate, ROAS, CAC. Generate daily/weekly reports.', capabilities: ['email_send'] }
    ],
    workflows: [
      { name: 'Ad Lead → Nurture → Convert', trigger_type: 'lead_in', trigger_config: { conditions: [] }, steps: [
        { type: 'update_lead', name: 'Score Lead', score: 40 },
        { type: 'integration', name: 'Welcome Email', integration_id: 'email_lead_welcome', args: { email: '{{email}}', name: '{{name}}', sector: 'marketing' } },
        { type: 'integration', name: 'WhatsApp', integration_id: 'whatsapp_lead_followup', args: { phone: '{{phone}}', name: '{{name}}', context: 'Let us know your marketing challenges — we create custom growth plans.' } }
      ]},
      { name: 'Hot Lead Alert', trigger_type: 'lead_in', trigger_config: { conditions: [{ field: 'score', operator: 'gt', value: 70 }] }, steps: [
        { type: 'integration', name: 'Alert', integration_id: 'whatsapp_send', args: { to: '{{ownerPhone}}', message: '🔥 HOT LEAD: {{name}} (Score: {{score}})' } }
      ]},
      { name: 'Weekly Report', trigger_type: 'scheduled', trigger_config: { cron: '0 9 * * 1' }, steps: [
        { type: 'integration', name: 'Report', integration_id: 'email_send', args: { to: '{{ownerEmail}}', subject: '📊 Weekly Marketing Report', html: '<h1>Weekly Summary</h1>' } }
      ]}
    ],
    pipelines: [{ name: 'Client Pipeline', stages: [{ name: 'Lead', order: 0 }, { name: 'Discovery Call', order: 1 }, { name: 'Proposal Sent', order: 2 }, { name: 'Negotiation', order: 3 }, { name: 'Onboarding', order: 4 }, { name: 'Active Client', order: 5 }] }]
  }
};

// ========================================
// MERGE: Premium + All Auto-Generated
// ========================================

const AUTO_GENERATED = generateAllSectorTemplates();

// Premium overrides auto-generated for yoga/real_estate/marketing
export const SECTOR_TEMPLATES = {
  ...AUTO_GENERATED,
  ...PREMIUM_TEMPLATES
};

// Log count on import
console.log(`[Sectors] ${Object.keys(SECTOR_TEMPLATES).length} sector templates loaded (3 premium + ${Object.keys(AUTO_GENERATED).length} auto-generated)`);
