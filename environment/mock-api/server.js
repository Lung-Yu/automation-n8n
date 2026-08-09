// TSMC n8n 課程 — Mock 設備/告警/工單/事件 API
// 重建於 2026-08-09（原始檔遺失，依 workflow JSON 呼叫方式 + scenarios/*.md 課堂驗證紀錄重建 contract）
// 純 Node.js 內建 http 模組，無外部依賴（docker-compose 只跑 `node server.js`，未 npm install）
const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// 設備狀態（GET /api/devices/:id）
// prod-node-03 是課程敘事裡的「慣犯」：CPU 持續偏高、反覆觸發告警，用來示範
// Adv1 去重 / Adv6 多源上下文（歷史 + 趨勢才看得出「反覆」）。
// prod-node-01 保持 healthy，用於 Adv6「換設備測試」對照組。
// ---------------------------------------------------------------------------
const devices = {
  'prod-node-03': { device_id: 'prod-node-03', cpu_percent: 97, memory_percent: 81, network_status: 'ok', status: 'critical' },
  'prod-node-01': { device_id: 'prod-node-01', cpu_percent: 22, memory_percent: 44, network_status: 'ok', status: 'healthy' },
  'prod-node-04': { device_id: 'prod-node-04', cpu_percent: 55, memory_percent: 60, network_status: 'ok', status: 'warning' },
  'prod-node-07': { device_id: 'prod-node-07', cpu_percent: 38, memory_percent: 50, network_status: 'degraded', status: 'warning' },
  'prod-db-01': { device_id: 'prod-db-01', cpu_percent: 61, memory_percent: 87, network_status: 'ok', status: 'warning' },
  'prod-web-02': { device_id: 'prod-web-02', cpu_percent: 18, memory_percent: 35, network_status: 'ok', status: 'healthy' },
  'dist-sw-03': { device_id: 'dist-sw-03', cpu_percent: 12, memory_percent: 30, network_status: 'ok', status: 'warning' },
};

function getDevice(id) {
  return devices[id] || { device_id: id, cpu_percent: 15, memory_percent: 25, network_status: 'ok', status: 'healthy' };
}

// ---------------------------------------------------------------------------
// 告警歷史（GET /api/alerts, GET /api/alerts/history?hours=24&host=x）
// Adv2 驗證紀錄要求「21 條告警 / critical 7」；prod-node-03 是重複出現的慣犯。
// ---------------------------------------------------------------------------
function buildAlertHistory() {
  const now = Date.now();
  const hour = 3600 * 1000;
  const rows = [];
  let id = 1;
  const push = (host, alertname, severity, hoursAgo, message) => {
    rows.push({
      id: `ALT-${String(id++).padStart(3, '0')}`,
      host,
      alertname,
      severity,
      message,
      timestamp: new Date(now - hoursAgo * hour).toISOString(),
    });
  };
  // prod-node-03：反覆 CPU 告警（慣犯，7 次分布在 24hr 內）
  [1, 3.5, 6, 9.5, 13, 17, 21].forEach((h, i) => {
    push('prod-node-03', 'HighCPUUsage', 'critical', h, `CPU usage exceeded 90% (reading: ${94 + i}%)`);
  });
  push('prod-db-01', 'HighMemoryUsage', 'warning', 2, 'Memory usage at 87%, approaching threshold of 90%');
  push('prod-db-01', 'HighMemoryUsage', 'warning', 15, 'Memory usage at 85%, approaching threshold of 90%');
  push('prod-node-04', 'DiskSpaceLow', 'warning', 4, 'Disk space usage at 78% on /var/log partition');
  push('prod-node-07', 'NetworkDegraded', 'warning', 8, 'Packet loss 3% on uplink interface');
  push('dist-sw-03', 'InterfaceFlapping', 'warning', 11, 'GE0/3 interface flapping detected');
  push('prod-web-02', 'HighLatency', 'info', 5, 'p99 latency 420ms, within acceptable range');
  push('prod-node-01', 'ScheduledMaintenance', 'info', 20, 'Routine maintenance window completed');
  push('prod-db-01', 'BackupCompleted', 'info', 22, 'Nightly backup completed successfully');
  push('prod-node-04', 'DiskSpaceLow', 'warning', 18, 'Disk space usage at 74% on /var/log partition');
  // 補到 21 條
  push('prod-web-02', 'DeploymentCompleted', 'info', 10, 'Rolling deployment completed, 0 errors');
  push('prod-node-07', 'ConfigDrift', 'warning', 16, 'Configuration drift detected vs baseline');
  push('prod-node-01', 'HealthCheckOk', 'info', 12, 'All health checks passing');
  push('prod-db-01', 'SlowQueryDetected', 'warning', 7, 'Query execution time exceeded 3s threshold');
  push('prod-node-04', 'HealthCheckOk', 'info', 14, 'All health checks passing');
  return rows;
}
const alertHistory = buildAlertHistory();

// ---------------------------------------------------------------------------
// Metrics 趨勢（GET /api/metrics/:host）— 6hr，每 30min 一筆
// prod-node-03 設計成持續爬升（呼應 Adv6「持續爬升，不會自己好」的敘事）。
// ---------------------------------------------------------------------------
function buildMetrics(host) {
  const now = Date.now();
  const points = [];
  const climbing = host === 'prod-node-03';
  for (let i = 12; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000).toISOString();
    const base = climbing ? 97 - i * 2.5 : (devices[host] ? devices[host].cpu_percent : 15) + (Math.sin(i) * 4);
    points.push({ timestamp: t, cpu_percent: Math.max(5, Math.round(base)) });
  }
  return { host, window_hours: 6, points };
}

// ---------------------------------------------------------------------------
// Ticket 系統（POST /api/tickets, GET /api/tickets, POST /api/tickets/:key/comments）
// 純記憶體 store，重啟即清空（課堂 demo 用，不需要持久化）。
// ---------------------------------------------------------------------------
let ticketSeq = 0;
const tickets = {};
function createTicket(body) {
  ticketSeq += 1;
  const key = `IT-${String(ticketSeq).padStart(3, '0')}`;
  const ticket = {
    key,
    id: key,
    fields: {
      summary: body.summary || body.title || `[${body.severity || 'info'}] ${body.alertname || 'Untitled'}`,
      description: body.description || body.message || '',
      priority: body.priority || 'Medium',
      labels: body.labels || [],
    },
    comments: [],
    created_at: new Date().toISOString(),
  };
  tickets[key] = ticket;
  return ticket;
}

// ---------------------------------------------------------------------------
// Incident 系統（GET /api/incidents/:id）— Adv5 PIR 生成用
// INC-2026-0703 是 guide.md 裡指名的示範案例。
// ---------------------------------------------------------------------------
const incidents = {
  'INC-2026-0703': {
    incident_id: 'INC-2026-0703',
    title: 'prod-node-03 CPU 持續過載導致 API 回應延遲',
    severity: 'critical',
    started_at: '2026-07-03T09:12:00Z',
    resolved_at: '2026-07-03T11:47:00Z',
    affected_hosts: ['prod-node-03', 'prod-web-02'],
    timeline: [
      { time: '2026-07-03T09:12:00Z', event: 'HighCPUUsage 告警觸發，prod-node-03 CPU 97%' },
      { time: '2026-07-03T09:18:00Z', event: '值班工程師確認告警，開始排查' },
      { time: '2026-07-03T09:35:00Z', event: '發現 prod-web-02 API p99 延遲上升至 1.8s' },
      { time: '2026-07-03T10:05:00Z', event: '判斷為背景批次任務未限制資源導致 CPU 搶佔' },
      { time: '2026-07-03T10:40:00Z', event: '調整批次任務 cgroup CPU limit，觀察 CPU 開始下降' },
      { time: '2026-07-03T11:47:00Z', event: 'CPU 回穩至 20% 以下，延遲恢復正常，事件關閉' },
    ],
    actions_taken: [
      { action: '調整批次任務 cgroup CPU limit 為 50%', by: 'network-ops', time: '2026-07-03T10:40:00Z' },
      { action: '重啟 prod-web-02 應用程序釋放連線池', by: 'network-ops', time: '2026-07-03T11:00:00Z' },
      { action: '新增 CPU > 90% 持續 5 分鐘的預警規則', by: 'network-ops', time: '2026-07-03T11:47:00Z' },
    ],
    impact: '約 2.5 小時內 api-gateway 服務 p99 延遲上升至 1.8 秒，未觀察到請求失敗，僅使用者體驗變慢。',
  },
};

// ---------------------------------------------------------------------------
// 通知收件匣（GET/POST /api/notify）— Adv0 無 Discord 時的替代出口
// ---------------------------------------------------------------------------
const notifications = [];

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------
function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api','devices','prod-node-03']

  try {
    if (parts[0] !== 'api') return sendJson(res, 404, { error: 'not found' });

    // GET /api/devices/:id
    if (parts[1] === 'devices' && parts[2] && req.method === 'GET') {
      return sendJson(res, 200, getDevice(decodeURIComponent(parts[2])));
    }

    // GET /api/alerts  (Demo7 Tool: 查告警歷史，回最近告警，不分 hours)
    if (parts[1] === 'alerts' && !parts[2] && req.method === 'GET') {
      return sendJson(res, 200, { total: alertHistory.length, alerts: alertHistory.slice(0, 10) });
    }

    // GET /api/alerts/history?hours=24&host=x
    if (parts[1] === 'alerts' && parts[2] === 'history' && req.method === 'GET') {
      const hours = Number(url.searchParams.get('hours') || 24);
      const host = url.searchParams.get('host');
      const cutoff = Date.now() - hours * 3600 * 1000;
      let rows = alertHistory.filter((a) => new Date(a.timestamp).getTime() >= cutoff);
      if (host) rows = rows.filter((a) => a.host === host);
      const critical_count = rows.filter((a) => a.severity === 'critical').length;
      return sendJson(res, 200, { total_alerts: rows.length, critical_count, alerts: rows });
    }

    // GET /api/metrics/:host
    if (parts[1] === 'metrics' && parts[2] && req.method === 'GET') {
      return sendJson(res, 200, buildMetrics(decodeURIComponent(parts[2])));
    }

    // GET /api/incidents/:id
    if (parts[1] === 'incidents' && parts[2] && req.method === 'GET') {
      const inc = incidents[decodeURIComponent(parts[2])];
      if (!inc) return sendJson(res, 404, { error: 'incident not found' });
      return sendJson(res, 200, inc);
    }

    // GET /api/tickets (list) / POST /api/tickets (create)
    if (parts[1] === 'tickets' && !parts[2] && req.method === 'GET') {
      return sendJson(res, 200, Object.values(tickets));
    }
    if (parts[1] === 'tickets' && !parts[2] && req.method === 'POST') {
      const body = await readBody(req);
      const fields = body.fields || body; // 相容 Jira 風格 body.fields.* 和扁平 body
      const ticket = createTicket({
        summary: fields.summary,
        description: fields.description,
        priority: fields.priority && fields.priority.name ? fields.priority.name : fields.priority,
        labels: fields.labels,
        alertname: body.alertname,
        severity: body.severity,
        message: body.message,
      });
      return sendJson(res, 201, ticket);
    }
    // POST /api/tickets/:key/comments
    if (parts[1] === 'tickets' && parts[2] && parts[3] === 'comments' && req.method === 'POST') {
      const key = decodeURIComponent(parts[2]);
      const ticket = tickets[key];
      if (!ticket) return sendJson(res, 404, { error: 'ticket not found' });
      const body = await readBody(req);
      const comment = { body: body.body || body.comment || '(no text)', time: new Date().toISOString() };
      ticket.comments.push(comment);
      return sendJson(res, 201, { key, comment });
    }

    // GET /api/notify (list) / POST /api/notify (receive)
    if (parts[1] === 'notify' && req.method === 'GET') {
      return sendJson(res, 200, notifications);
    }
    if (parts[1] === 'notify' && req.method === 'POST') {
      const body = await readBody(req);
      notifications.push({ ...body, received_at: new Date().toISOString() });
      return sendJson(res, 201, { ok: true });
    }

    if (parts[0] === 'health' || (parts.length === 0)) {
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: 'not found', path: url.pathname });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`mock-api listening on :${PORT}`);
});
