const { Client } = require('pg');
const urls = {
  A: "postgresql://neondb_owner:npg_41DvuXKWyaHJ@ep-super-glitter-aqj6d5g0-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  B: "postgresql://neondb_owner:npg_tRbmU5F0pcYX@ep-aged-paper-apxuj960-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
};
(async () => {
  for (const [k, u] of Object.entries(urls)) {
    const c = new Client({ connectionString: u });
    try {
      await c.connect();
      const r = await c.query("SELECT to_regclass('public.dispatch_queue') AS t");
      let cols = [];
      if (r.rows[0].t) {
        const cc = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='dispatch_queue' ORDER BY ordinal_position");
        cols = cc.rows.map(x => x.column_name+':'+x.data_type);
      }
      console.log(k, '=> dispatch_queue:', r.rows[0].t, '| cols:', cols.join(', '));
      await c.end();
    } catch(e) { console.log(k, 'ERR', e.message); }
  }
})();
