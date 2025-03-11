pnpn# Database Design for Clusters and ClusterGoals

## Overview
To optimize GPT calls and improve performance, we're implementing persistent storage for cluster results and cluster goals. This document outlines the database design and implementation details.

## Table Structures

### Clusters Table
```sql
CREATE TABLE Clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inputHash TEXT NOT NULL,      -- Hash of input parameters for quick lookup
    clusterResult JSONB NOT NULL, -- Stored cluster data from GPT
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clusters_input_hash ON Clusters(inputHash);
```

### ClusterGoals Table
```sql
CREATE TABLE ClusterGoals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clusterId UUID NOT NULL REFERENCES Clusters(id),
    goal JSONB NOT NULL,         -- Stored goal data from GPT
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clusterId) REFERENCES Clusters(id) ON DELETE CASCADE
);

CREATE INDEX idx_cluster_goals_cluster_id ON ClusterGoals(clusterId);
```

## Implementation Details

### Location
- Database models and utilities will be stored in `app/db/`
- Models will be defined in `app/db/models/`
- Database configuration and client initialization in `app/db/index.ts`

### Usage Pattern

1. When generating clusters:
   ```typescript
   // Check if we have cached results
   const existingCluster = await db.clusters.findByInputHash(inputHash);
   if (existingCluster) {
     return existingCluster.clusterResult;
   }
   
   // If not, call GPT and store results
   const gptResult = await callGPT(input);
   await db.clusters.create({
     inputHash,
     clusterResult: gptResult
   });
   ```

2. When generating goals:
   ```typescript
   // Similar pattern - check cache first
   const existingGoal = await db.clusterGoals.findByClusterId(clusterId);
   if (existingGoal) {
     return existingGoal.goal;
   }
   
   // If not found, generate and store
   const goalResult = await generateGoal(clusterId);
   await db.clusterGoals.create({
     clusterId,
     goal: goalResult
   });
   ```

### Integration Points

1. `app/api/cluster/route.ts`
   - Before making GPT calls, check the database for existing results
   - After successful GPT calls, store results in the database

2. `app/api/cluster-goals/route.ts`
   - Similar pattern to clusters
   - Maintains relationship with parent cluster through clusterId

3. `app/api/tools/cluster_tool.ts`
   - Update to use database layer for caching results

## Best Practices

1. **Input Hashing**
   - Use consistent hashing method for inputs
   - Consider what parameters affect output
   - Document hash generation method

2. **Cache Invalidation**
   - Implement TTL if needed
   - Consider versioning for GPT model changes
   - Plan for manual invalidation capability

3. **Error Handling**
   - Handle database errors gracefully
   - Provide fallback to GPT if database is unavailable
   - Log errors appropriately

4. **Performance**
   - Use appropriate indexes
   - Monitor query performance
   - Consider implementing batch operations for bulk processing

## Next Steps

1. Create database models in `app/db/`
2. Implement database utilities and helpers
3. Update existing routes to use database layer
4. Add monitoring and logging
5. Create migration scripts
6. Add tests for database operations

## Future Considerations

1. Implement cache warming strategies
2. Add analytics for cache hit rates
3. Consider implementing partial matching for similar inputs
4. Add admin interface for managing cached data
