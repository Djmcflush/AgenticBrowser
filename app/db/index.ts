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
};

// Export pool for direct access if needed
export { pool };
