import { Pool } from 'pg';
import crypto from 'crypto';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Utility function to generate consistent hash for inputs
export function generateInputHash(input: any): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Database client with type-safe methods
export const db = {
  clusters: {
    async findByInputHash(inputHash: string) {
      const result = await pool.query(
        'SELECT * FROM Clusters WHERE inputHash = $1',
        [inputHash]
      );
      return result.rows[0];
    },

    async create(data: { inputHash: string; clusterResult: any }) {
      const result = await pool.query(
        'INSERT INTO Clusters (inputHash, clusterResult) VALUES ($1, $2) RETURNING *',
        [data.inputHash, data.clusterResult]
      );
      return result.rows[0];
    },

    async update(id: string, data: { clusterResult: any }) {
      const result = await pool.query(
        'UPDATE Clusters SET clusterResult = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [data.clusterResult, id]
      );
      return result.rows[0];
    },
  },

  clusterGoals: {
    async findByClusterId(clusterId: string) {
      const result = await pool.query(
        'SELECT * FROM ClusterGoals WHERE clusterId = $1',
        [clusterId]
      );
      return result.rows[0];
    },

    async create(data: { clusterId: string; goal: any }) {
      const result = await pool.query(
        'INSERT INTO ClusterGoals (clusterId, goal) VALUES ($1, $2) RETURNING *',
        [data.clusterId, data.goal]
      );
      return result.rows[0];
    },

    async update(id: string, data: { goal: any }) {
      const result = await pool.query(
        'UPDATE ClusterGoals SET goal = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [data.goal, id]
      );
      return result.rows[0];
    },
  },

  urlHistory: {
    async findByUrl(url: string) {
      const result = await pool.query(
        'SELECT * FROM url_history WHERE url = $1',
        [url]
      );
      return result.rows[0];
    },

    async batchFindByUrls(urls: string[]) {
      const result = await pool.query(
        'SELECT * FROM url_history WHERE url = ANY($1)',
        [urls]
      );
      return result.rows;
    },

    async create(data: { 
      url: string; 
      title: string; 
      descriptive_representation: string; 
      embedding: number[] 
    }) {
      const result = await pool.query(
        'INSERT INTO url_history (url, title, descriptive_representation, embedding) VALUES ($1, $2, $3, $4) RETURNING *',
        [data.url, data.title, data.descriptive_representation, data.embedding]
      );
      return result.rows[0];
    },

    async batchCreate(dataArray: Array<{ 
      url: string; 
      title: string; 
      descriptive_representation: string; 
      embedding: number[] 
    }>) {
      // Create a transaction for batch insertion
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const promises = dataArray.map(data => 
          client.query(
            'INSERT INTO url_history (url, title, descriptive_representation, embedding) VALUES ($1, $2, $3, $4) ON CONFLICT (url) DO UPDATE SET title = $2, descriptive_representation = $3, embedding = $4, updatedat = CURRENT_TIMESTAMP RETURNING *',
            [data.url, data.title, data.descriptive_representation, data.embedding]
          )
        );
        
        const results = await Promise.all(promises);
        await client.query('COMMIT');
        
        return results.map(r => r.rows[0]);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  }
};

// Export pool for direct access if needed
export { pool };
