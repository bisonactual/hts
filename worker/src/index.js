const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url      = new URL(request.url);
    const path     = url.pathname;
    const method   = request.method;

    try {
      // GET /dates  — list all dates
      if (path === '/dates' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id FROM dates ORDER BY id').all();
        return json(results.map(r => r.id));
      }

      // POST /dates  — add a date { id: 'YYYY-MM-DD' }
      if (path === '/dates' && method === 'POST') {
        const { id } = await request.json();
        if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(id)) return json({ error: 'Invalid date' }, 400);
        await env.DB.prepare('INSERT OR IGNORE INTO dates (id) VALUES (?)').bind(id).run();
        return json({ ok: true });
      }

      // DELETE /dates/:id  — remove date + its tasks
      const dateMatch = path.match(/^\/dates\/(\d{4}-\d{2}-\d{2})$/);
      if (dateMatch && method === 'DELETE') {
        const id = dateMatch[1];
        await env.DB.prepare('DELETE FROM tasks WHERE date_id = ?').bind(id).run();
        await env.DB.prepare('DELETE FROM dates WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }

      // GET /tasks?date=YYYY-MM-DD  — list tasks
      if (path === '/tasks' && method === 'GET') {
        const date = url.searchParams.get('date');
        const stmt = date
          ? env.DB.prepare('SELECT id, date_id AS date, area, job, created_at AS created FROM tasks WHERE date_id = ? ORDER BY id').bind(date)
          : env.DB.prepare('SELECT id, date_id AS date, area, job, created_at AS created FROM tasks ORDER BY id');
        const { results } = await stmt.all();
        return json(results);
      }

      // POST /tasks  — create task { date, area, job }
      if (path === '/tasks' && method === 'POST') {
        const { date, area, job } = await request.json();
        if (!date || !area || !job) return json({ error: 'Missing field' }, 400);
        const result = await env.DB.prepare(
          'INSERT INTO tasks (date_id, area, job) VALUES (?, ?, ?)'
        ).bind(date, area, job).run();
        return json({ id: result.meta.last_row_id });
      }

      // DELETE /tasks?date=YYYY-MM-DD  — clear all tasks for a date
      if (path === '/tasks' && method === 'DELETE') {
        const date = url.searchParams.get('date');
        if (!date) return json({ error: 'date param required' }, 400);
        await env.DB.prepare('DELETE FROM tasks WHERE date_id = ?').bind(date).run();
        return json({ ok: true });
      }

      // PUT /tasks/:id  — update task { area, job }
      const taskMatch = path.match(/^\/tasks\/(\d+)$/);
      if (taskMatch && method === 'PUT') {
        const { area, job } = await request.json();
        await env.DB.prepare(
          'UPDATE tasks SET area = ?, job = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(area, job, parseInt(taskMatch[1])).run();
        return json({ ok: true });
      }

      // DELETE /tasks/:id  — delete single task
      if (taskMatch && method === 'DELETE') {
        await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(parseInt(taskMatch[1])).run();
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
