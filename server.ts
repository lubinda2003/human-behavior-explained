import http from 'node:http';

const PORT = 3000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'pick-your-fate-engine',
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Interactive Dilemmas &mdash; Telegram Interaction Engine</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    .container { max-width: 680px; margin: 2rem auto; background: #1e293b; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
    h1 { margin-top: 0; font-size: 1.5rem; color: #38bdf8; }
    p { line-height: 1.6; color: #94a3b8; }
    .badge { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
    ul { padding-left: 1.25rem; color: #cbd5e1; line-height: 1.8; }
    .footer { margin-top: 1.5rem; font-size: 0.85rem; color: #64748b; border-top: 1px solid #334155; padding-top: 1rem; }
  </style>
</head>
<body>
  <div class="container" id="app-container">
    <div class="badge" id="status-badge">Worker &amp; Pipeline Engine Online</div>
    <h1 id="app-title">Pick Your Fate &mdash; Telegram Interaction Engine</h1>
    <p id="app-desc">Production-ready Cloudflare Worker &amp; Telegram Interaction Pipeline for Interactive Dilemmas.</p>
    <ul>
      <li><strong>Content Pipeline:</strong> Immersive dilemmas, multi-archetype variety, anti-slop gates</li>
      <li><strong>Telegram Engine:</strong> Cloudflare D1 persistence, atomic lifecycle state machine</li>
      <li><strong>Voting &amp; Reveals:</strong> Poll answers, scheduled closures, real-time result calculations</li>
    </ul>
    <div class="footer" id="app-footer">Status: Operational &bull; Ready for Cloudflare Worker Deployment</div>
  </div>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pick Your Fate local preview server listening on http://0.0.0.0:${PORT}`);
});
