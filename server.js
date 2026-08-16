import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { SECTOR_TEMPLATES } from './sectorTemplates.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('./ecosystem.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS orgs (id TEXT PRIMARY KEY, name TEXT, sector TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT, type TEXT, sector TEXT, orgId TEXT, status TEXT, capabilities TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, orgId TEXT, name TEXT, phone TEXT, email TEXT, source TEXT, score INTEGER, status TEXT, createdAt TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, orgId TEXT, title TEXT, value INTEGER, stage TEXT, status TEXT, leadName TEXT, sector TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, name TEXT, status TEXT, orgId TEXT)`);
    });
  }
});

// Helper for querying promises
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { if (err) rej(err); else res(this); }));
const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, result) => { if (err) rej(err); else res(result); }));
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => { if (err) rej(err); else res(rows); }));

app.get('/api/daddy/overview', async (req, res) => {
  try {
    const workflows = await all(`SELECT id FROM workflows`);
    const leads = await all(`SELECT id FROM leads`);
    const orgs = await all(`SELECT id, sector FROM orgs`);
    const agents = await all(`SELECT id, sector FROM agents`);
    const deals = await all(`SELECT value, sector FROM deals WHERE status = 'won'`);

    let sectors = {};
    for (let o of orgs) {
      if (!sectors[o.sector]) sectors[o.sector] = { orgs: 0, agents: 0, revenue: 0 };
      sectors[o.sector].orgs++;
    }
    for (let a of agents) {
      if (!sectors[a.sector]) sectors[a.sector] = { orgs: 0, agents: 0, revenue: 0 };
      sectors[a.sector].agents++;
    }
    for (let d of deals) {
      if (!sectors[d.sector]) sectors[d.sector] = { orgs: 0, agents: 0, revenue: 0 };
      sectors[d.sector].revenue += d.value;
    }

    res.json({
      activeWorkflows: workflows.length,
      totalLeads: leads.length,
      sectors: sectors
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/daddy/agents', async (req, res) => {
  try {
    const agents = await all(`SELECT a.*, o.name as org FROM agents a LEFT JOIN orgs o ON a.orgId = o.id`);
    agents.forEach(a => { if (a.capabilities) a.capabilities = JSON.parse(a.capabilities); });
    res.json(agents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/daddy/agents/:id/suspend', async (req, res) => {
  await run(`UPDATE agents SET status = 'suspended' WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

app.patch('/api/daddy/agents/:id/activate', async (req, res) => {
  await run(`UPDATE agents SET status = 'active' WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

app.delete('/api/daddy/agents/:id', async (req, res) => {
  await run(`DELETE FROM agents WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

app.post('/api/daddy/agents/clone', async (req, res) => {
  try {
    const agent = await get(`SELECT * FROM agents WHERE id = ?`, [req.body.agentId]);
    if (agent) {
      const cloneId = `agent_${Date.now()}`;
      await run(`INSERT INTO agents (id, name, type, sector, orgId, status, capabilities) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [cloneId, agent.name + ' (Clone)', agent.type, agent.sector, req.body.targetOrgId, 'active', agent.capabilities]);
      res.json({ clone: { id: cloneId, name: agent.name + ' (Clone)' } });
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/daddy/revenue', async (req, res) => {
  try {
    const deals = await all(`SELECT * FROM deals ORDER BY value DESC LIMIT 5`);
    const totalWon = await get(`SELECT SUM(value) as total FROM deals WHERE status = 'won'`);
    res.json({ mrr: (totalWon.total || 0) * 0.1, arr: totalWon.total || 0, topDeals: deals.map(d => ({...d, lead: d.leadName})) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sectors/templates', (req, res) => {
  res.json(Object.values(SECTOR_TEMPLATES));
});

app.post('/api/sectors/activate', async (req, res) => {
  const { orgId, sector } = req.body;
  const template = SECTOR_TEMPLATES[sector];
  if (!template) return res.status(404).json({ error: 'Sector not found' });

  try {
    await run(`UPDATE orgs SET sector = ? WHERE id = ?`, [sector, orgId]);

    let newAgents = [];
    for (let a of template.agents) {
      const aid = `agent_${Date.now()}_${Math.random()}`;
      await run(`INSERT INTO agents (id, name, type, sector, orgId, status, capabilities) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [aid, a.name, a.type, sector, orgId, 'active', JSON.stringify(a.capabilities || [])]);
      newAgents.push({ id: aid, name: a.name });
    }

    let newWorkflows = [];
    for (let w of template.workflows) {
      const wid = `wf_${Date.now()}_${Math.random()}`;
      await run(`INSERT INTO workflows (id, name, status, orgId) VALUES (?, ?, ?, ?)`,
        [wid, w.name, 'active', orgId]);
      newWorkflows.push({ id: wid, name: w.name });
    }

    res.json({ agents: newAgents, workflows: newWorkflows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leads/:orgId', async (req, res) => {
  try {
    const leads = await all(`SELECT * FROM leads WHERE orgId = ? ORDER BY createdAt DESC`, [req.params.orgId]);
    res.json(leads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leads', async (req, res) => {
  try {
    const newLead = {
      id: `lead_${Date.now()}`,
      ...req.body,
      score: Math.floor(Math.random() * 100),
      status: 'new',
      createdAt: new Date().toISOString()
    };
    await run(`INSERT INTO leads (id, orgId, name, phone, email, source, score, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newLead.id, newLead.orgId, newLead.name, newLead.phone, newLead.email, newLead.source, newLead.score, newLead.status, newLead.createdAt]);
    res.json({ lead: newLead, workflowsTriggered: 1 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/deals/:orgId', async (req, res) => {
  try {
    const deals = await all(`SELECT * FROM deals WHERE orgId = ?`, [req.params.orgId]);
    res.json(deals.map(d => ({...d, lead: {name: d.leadName}})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orgs/hire', async (req, res) => {
  try {
    const { name, sector } = req.body;
    const newOrgId = `org_${Date.now()}`;
    await run(`INSERT INTO orgs (id, name, sector) VALUES (?, ?, ?)`, [newOrgId, name, sector]);

    const template = SECTOR_TEMPLATES[sector];
    let newAgents = [];
    if (template) {
      for (let a of template.agents) {
        const aid = `agent_${Date.now()}_${Math.random()}`;
        await run(`INSERT INTO agents (id, name, type, sector, orgId, status, capabilities) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [aid, a.name, a.type, sector, newOrgId, 'active', JSON.stringify(a.capabilities || [])]);
        newAgents.push({ id: aid, name: a.name });
      }
    }
    res.json({ org: { id: newOrgId, name }, message: 'Company hired and agents deployed.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3001, () => console.log('YH Backend running on 3001'));
