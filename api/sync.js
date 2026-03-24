const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { empresa_id, dados } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of (dados.produtos || [])) {
      await client.query(
        `INSERT INTO sys_produto (nome, preco_venda, estoque_atual, empresa_id, tipo, codigo_barras) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (codigo_barras) DO UPDATE SET 
         nome = $1, preco_venda = $2, estoque_atual = $3, tipo = $5`,
        [p.nome, p.precoVenda, p.estoqueAtual, empresa_id, p.tipo || 'SIMPLES', p.codigo]
      );
    }
    await client.query('COMMIT');
    res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
