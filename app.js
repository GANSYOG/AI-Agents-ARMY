// ============================================
// YH ECOSYSTEM — Daddy Console App Logic
// Standalone: No React, No Vite, No Build Step
// ============================================

const API = 'http://localhost:3001';

// ============================================
// STATE
// ============================================

let state = {
  overview: null,
  agents: [],
  revenue: null,
  leads: [],
  deals: [],
  templates: [],
  orgs: [],
  actionLog: []
};

const SECTOR_ICONS = {
  yoga: '🧘', real_estate: '🏠', marketing: '📢', general: '🏢'
};

const SECTOR_COLORS = {
  yoga: '#a78bfa', real_estate: '#f59e0b', marketing: '#10b981', general: '#6b7280'
};

// ============================================
// UTILITIES
// ============================================

function formatCurrency(v) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function addLog(msg, type = '') {
  const time = new Date().toLocaleTimeString();
  state.actionLog.unshift({ msg: `[${time}] ${msg}`, type });
  if (state.actionLog.length > 50) state.actionLog.length = 50;
  renderActionLog();
}

async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    return await res.json();
  } catch (err) {
    addLog(`API Error: ${err.message}`, 'error');
    return null;
  }
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchOverview() {
  state.overview = await apiFetch('/api/daddy/overview');
  if (state.overview) {
    document.getElementById('workflow-count').textContent = state.overview.activeWorkflows || 0;
    document.getElementById('lead-count').textContent = state.overview.totalLeads || 0;
  }
}

async function fetchAgents() {
  state.agents = await apiFetch('/api/daddy/agents') || [];
  document.getElementById('agent-count').textContent = state.agents.length;
  document.getElementById('agents-total').textContent = state.agents.length;

  // Build org list for lead form
  const orgMap = {};
  state.agents.forEach(a => { if (a.orgId && a.org) orgMap[a.orgId] = a.org; });
  state.orgs = Object.entries(orgMap).map(([id, name]) => ({ id, name }));
  renderOrgSelect();
}

async function fetchRevenue() {
  state.revenue = await apiFetch('/api/daddy/revenue');
}

async function fetchTemplates() {
  state.templates = await apiFetch('/api/sectors/templates') || [];
  const sc = document.getElementById('sector-count');
  if (sc) sc.textContent = state.templates.length;
}

async function fetchLeads() {
  // Fetch leads for all orgs
  state.leads = [];
  for (const org of state.orgs) {
    const leads = await apiFetch(`/api/leads/${org.id}`);
    if (leads && Array.isArray(leads)) {
      state.leads.push(...leads.map(l => ({ ...l, orgName: org.name })));
    }
  }
  state.leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.getElementById('lead-count').textContent = state.leads.length;
}

async function fetchDeals() {
  state.deals = [];
  for (const org of state.orgs) {
    const deals = await apiFetch(`/api/deals/${org.id}`);
    if (deals && Array.isArray(deals)) {
      state.deals.push(...deals.map(d => ({ ...d, orgName: org.name })));
    }
  }
}

async function refreshAll() {
  addLog('Refreshing system telemetry...', 'success');
  document.getElementById('refresh-btn').textContent = '⏳ Loading...';
  
  await Promise.all([fetchOverview(), fetchAgents(), fetchRevenue(), fetchTemplates()]);
  await Promise.all([fetchLeads(), fetchDeals()]);
  
  renderAll();
  document.getElementById('refresh-btn').textContent = '🔄 Refresh';
  addLog('System telemetry refreshed', 'success');
}

// ============================================
// RENDERING
// ============================================

function renderAll() {
  renderKPIs();
  renderSectors();
  renderAgents();
  renderRevenue();
  renderLeads();
  renderDeals();
  renderTemplates();
}

function renderKPIs() {
  if (!state.overview) return;
  const o = state.overview;
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = [
    { icon: '🏢', label: 'Organizations', value: o.totalOrgs, color: 'purple' },
    { icon: '🤖', label: 'Total Agents', value: o.totalAgents, color: 'green' },
    { icon: '⚡', label: 'Active Workflows', value: o.activeWorkflows, color: 'gold' },
    { icon: '📋', label: 'Total Leads', value: o.totalLeads, color: 'blue' },
    { icon: '💰', label: 'Pipeline Value', value: formatCurrency(o.totalPipelineValue || 0), color: 'cyan' },
    { icon: '🌐', label: 'Sector Templates', value: state.templates.length, color: 'red' }
  ].map(k => `
    <div class="kpi-card" data-color="${k.color}">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join('');
}

function renderSectors() {
  if (!state.overview?.sectors) return;
  const grid = document.getElementById('sector-grid');
  grid.innerHTML = Object.entries(state.overview.sectors).map(([sector, data]) => `
    <div class="sector-card" data-sector="${sector}">
      <div class="sector-header">
        <span class="sector-icon">${SECTOR_ICONS[sector] || '🏢'}</span>
        <span class="sector-name">${sector.replace('_', ' ')}</span>
      </div>
      <div class="sector-stats">
        <div>
          <div class="sector-stat-value">${data.orgs}</div>
          <div class="sector-stat-label">Orgs</div>
        </div>
        <div>
          <div class="sector-stat-value">${data.agents}</div>
          <div class="sector-stat-label">Agents</div>
        </div>
        <div>
          <div class="sector-stat-value">${formatCurrency(data.revenue || 0)}</div>
          <div class="sector-stat-label">Revenue</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderAgents() {
  const tbody = document.getElementById('agents-tbody');
  if (!state.agents.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No agents found</td></tr>';
    return;
  }

  tbody.innerHTML = state.agents.map(a => {
    const statusClass = `status-${a.status}`;
    const statusLabel = a.status.charAt(0).toUpperCase() + a.status.slice(1);
    return `
      <tr>
        <td style="font-weight:600">${a.name}</td>
        <td style="color:var(--text-secondary);font-size:13px">${a.type}</td>
        <td>
          <span class="sector-tag" data-sector="${a.sector}">
            ${SECTOR_ICONS[a.sector] || '🏢'} ${(a.sector || '').replace('_', ' ')}
          </span>
        </td>
        <td style="color:var(--text-secondary);font-size:13px">${a.org || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${(a.capabilities || []).length} tools</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="cloneAgent('${a.id}','${a.name}')" title="Clone">📋</button>
            ${a.status === 'active'
              ? `<button class="btn btn-outline btn-sm" style="border-color:var(--accent-gold);color:var(--accent-gold)" onclick="suspendAgent('${a.id}','${a.name}')" title="Suspend">⏸️</button>`
              : `<button class="btn btn-outline btn-sm" style="border-color:var(--accent-green);color:var(--accent-green)" onclick="activateAgent('${a.id}','${a.name}')" title="Activate">▶️</button>`
            }
            <button class="btn btn-danger btn-sm" onclick="destroyAgent('${a.id}','${a.name}')" title="Destroy">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRevenue() {
  if (!state.revenue) return;
  const r = state.revenue;
  const grid = document.getElementById('revenue-grid');

  grid.innerHTML = `
    <div class="revenue-card" style="border-left:3px solid var(--accent-green)">
      <div class="revenue-label">This Month</div>
      <div class="revenue-value">${formatCurrency(r.thisMonth?.revenue || 0)}</div>
      <div class="revenue-sub">${r.thisMonth?.deals || 0} deals closed</div>
    </div>
    <div class="revenue-card" style="border-left:3px solid var(--text-muted)">
      <div class="revenue-label">Last Month</div>
      <div class="revenue-value">${formatCurrency(r.lastMonth?.revenue || 0)}</div>
      <div class="revenue-sub">${r.lastMonth?.deals || 0} deals closed</div>
    </div>
    <div class="revenue-card" style="border-left:3px solid ${(r.growth || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
      <div class="revenue-label">Growth</div>
      <div class="revenue-value ${(r.growth || 0) >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${(r.growth || 0) >= 0 ? '📈' : '📉'} ${(r.growth || 0).toFixed(1)}%
      </div>
      <div class="revenue-sub">Month over month</div>
    </div>
  `;

  const dealsEl = document.getElementById('top-deals');
  if (!r.topDeals || r.topDeals.length === 0) {
    dealsEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤝</div><p>No closed deals yet. Start converting leads!</p></div>';
    return;
  }
  dealsEl.innerHTML = r.topDeals.map(d => `
    <div class="deal-item">
      <div>
        <div class="deal-title">${d.title}</div>
        <div class="deal-meta">${d.lead || 'Direct'} • ${(d.sector || '').replace('_', ' ')}</div>
      </div>
      <div class="deal-value">${formatCurrency(d.value)}</div>
    </div>
  `).join('');
}

function renderLeads() {
  const tbody = document.getElementById('leads-tbody');
  if (!state.leads.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">No leads yet. Add one above!</td></tr>';
    return;
  }

  const statusColors = {
    new: 'blue', contacted: 'gold', qualified: 'green', converted: 'purple', lost: 'red'
  };

  tbody.innerHTML = state.leads.map(l => `
    <tr>
      <td style="font-weight:600">${l.name}</td>
      <td class="mono" style="font-size:12px;color:var(--text-secondary)">${l.phone || '—'}</td>
      <td><span class="badge badge-${l.source === 'ad' ? 'gold' : l.source === 'referral' ? 'green' : 'blue'}">${l.source}</span></td>
      <td style="font-weight:700;color:${l.score >= 70 ? 'var(--accent-green)' : l.score >= 40 ? 'var(--accent-gold)' : 'var(--text-muted)'}">${l.score}</td>
      <td><span class="badge badge-${statusColors[l.status] || 'blue'}">${l.status}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${timeAgo(l.createdAt)}</td>
    </tr>
  `).join('');
}

function renderDeals() {
  const tbody = document.getElementById('deals-tbody');
  if (!state.deals.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No deals yet</td></tr>';
    return;
  }

  const stageColors = {
    discovery: 'blue', proposal: 'gold', negotiation: 'purple', closed_won: 'green', closed_lost: 'red'
  };

  tbody.innerHTML = state.deals.map(d => `
    <tr>
      <td style="font-weight:600">${d.title}</td>
      <td style="color:var(--text-secondary)">${d.lead?.name || '—'}</td>
      <td><span class="badge badge-${stageColors[d.stage] || 'blue'}">${d.stage}</span></td>
      <td style="font-weight:700;color:var(--accent-green)">${formatCurrency(d.value)}</td>
      <td><span class="badge badge-${d.status === 'won' ? 'green' : d.status === 'lost' ? 'red' : 'blue'}">${d.status}</span></td>
    </tr>
  `).join('');
}

let sectorFilter = '';

function renderTemplates() {
  const el = document.getElementById('sector-templates');
  if (!state.templates.length) {
    el.innerHTML = '<div class="empty-state"><p>No templates loaded</p></div>';
    return;
  }

  const filtered = sectorFilter
    ? state.templates.filter(t => t.name.toLowerCase().includes(sectorFilter) || t.sector.includes(sectorFilter))
    : state.templates;

  el.innerHTML = `
    <div style="margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <input type="text" id="sector-search" placeholder="Search ${state.templates.length} sectors..." value="${sectorFilter}"
        style="flex:1;min-width:200px;padding:10px 16px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:14px" />
      <span style="font-size:13px;color:var(--text-muted)">${filtered.length} of ${state.templates.length} sectors</span>
    </div>
    <div class="sector-grid">${filtered.map(t => `
      <div class="sector-card" data-sector="${t.sector}" style="cursor:default">
        <div class="sector-header">
          <span class="sector-icon">${SECTOR_ICONS[t.sector] || '🏢'}</span>
          <span class="sector-name" style="font-size:14px">${t.name}</span>
        </div>
        <div class="sector-stats" style="margin-bottom:14px">
          <div>
            <div class="sector-stat-value">${t.agentCount}</div>
            <div class="sector-stat-label">Agents</div>
          </div>
          <div>
            <div class="sector-stat-value">${t.workflowCount}</div>
            <div class="sector-stat-label">Workflows</div>
          </div>
          <div>
            <div class="sector-stat-value">${t.pipelineCount}</div>
            <div class="sector-stat-label">Pipelines</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="width:100%" onclick="activateSector('${t.sector}','${t.name.replace(/'/g,"")}')">⚡ Activate</button>
      </div>
    `).join('')}</div>`;

  // Bind search
  setTimeout(() => {
    const input = document.getElementById('sector-search');
    if (input) input.oninput = (e) => { sectorFilter = e.target.value.toLowerCase(); renderTemplates(); };
  }, 0);
}

async function activateSector(sector, name) {
  if (!state.orgs.length) { alert('No organizations exist. Create one first.'); return; }
  const orgId = state.orgs.length === 1 ? state.orgs[0].id : prompt('Enter Organization ID to activate this sector for:\n\n' + state.orgs.map(o => o.id + ' → ' + o.name).join('\n'));
  if (!orgId) return;
  addLog(`Activating sector: ${name}...`, 'success');
  const res = await apiFetch('/api/sectors/activate', { method: 'POST', body: JSON.stringify({ orgId, sector }) });
  if (res?.agents) {
    addLog(`✅ ${name} activated: ${res.agents.length} agents, ${res.workflows.length} workflows deployed`, 'success');
    await refreshAll();
  } else {
    addLog(`❌ Activation failed: ${res?.error || 'unknown'}`, 'error');
  }
}

function renderActionLog() {
  const el = document.getElementById('action-log');
  if (!state.actionLog.length) {
    el.innerHTML = '<div class="log-entry" style="color:var(--text-muted)">Waiting for actions...</div>';
    return;
  }
  el.innerHTML = state.actionLog.map(l =>
    `<div class="log-entry ${l.type}">${l.msg}</div>`
  ).join('');
}

function renderOrgSelect() {
  const sel = document.getElementById('lead-org');
  sel.innerHTML = state.orgs.map(o =>
    `<option value="${o.id}">${o.name}</option>`
  ).join('');
}

// ============================================
// AGENT ACTIONS (REAL API CALLS)
// ============================================

async function suspendAgent(id, name) {
  addLog(`Suspending agent: ${name}...`, 'warning');
  await apiFetch(`/api/daddy/agents/${id}/suspend`, { method: 'PATCH' });
  addLog(`Agent ${name} SUSPENDED`, 'warning');
  await fetchAgents();
  renderAgents();
}

async function activateAgent(id, name) {
  addLog(`Reactivating agent: ${name}...`, 'success');
  await apiFetch(`/api/daddy/agents/${id}/activate`, { method: 'PATCH' });
  addLog(`Agent ${name} REACTIVATED`, 'success');
  await fetchAgents();
  renderAgents();
}

async function destroyAgent(id, name) {
  if (!confirm(`⚠️ HARD DESTROY: ${name}\n\nPermanently deletes agent and all execution history.\nThis is IRREVERSIBLE. Proceed?`)) return;
  addLog(`HARD DESTROYING: ${name}...`, 'error');
  await apiFetch(`/api/daddy/agents/${id}`, { method: 'DELETE' });
  addLog(`Agent ${name} DESTROYED PERMANENTLY`, 'error');
  await fetchAgents();
  renderAgents();
}

async function cloneAgent(id, name) {
  const targetOrgId = prompt('Enter target Organization ID for clone:');
  if (!targetOrgId) return;
  addLog(`Cloning ${name} → org ${targetOrgId.substring(0, 8)}...`, 'success');
  const res = await apiFetch('/api/daddy/agents/clone', {
    method: 'POST',
    body: JSON.stringify({ agentId: id, targetOrgId })
  });
  addLog(`Clone complete: ${res?.clone?.name || 'OK'}`, 'success');
  await fetchAgents();
  renderAgents();
}

// ============================================
// LEAD CREATION (WITH WORKFLOW TRIGGER)
// ============================================

document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const orgId = document.getElementById('lead-org').value;
  const name = document.getElementById('lead-name').value;
  const phone = document.getElementById('lead-phone').value;
  const email = document.getElementById('lead-email').value;
  const source = document.getElementById('lead-source').value;

  if (!orgId || !name) return;

  addLog(`Creating lead: ${name} (${source})...`, 'success');

  const res = await apiFetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify({ orgId, name, phone, email, source })
  });

  if (res?.lead) {
    addLog(`✅ Lead created: ${res.lead.name} → ${res.workflowsTriggered} workflow(s) triggered`, 'success');
    document.getElementById('lead-name').value = '';
    document.getElementById('lead-phone').value = '';
    document.getElementById('lead-email').value = '';

    // Refresh leads and overview
    await Promise.all([fetchLeads(), fetchOverview()]);
    renderLeads();
    renderKPIs();
  } else {
    addLog(`❌ Failed to create lead`, 'error');
  }
});

// ============================================
// TAB NAVIGATION
// ============================================

document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    // Update content
    const tab = item.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
  });
});

// ============================================
// BOOT
// ============================================

(async function boot() {
  addLog('YH Ecosystem booting...', 'success');
  await refreshAll();
  addLog(`🟢 System online — ${state.templates.length} sector templates loaded`, 'success');
})();
