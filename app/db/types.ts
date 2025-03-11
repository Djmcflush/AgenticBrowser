export interface Cluster {
  id: string;
  inputHash: string;
  clusterResult: any; // JSON data
  createdAt: Date;
  updatedAt: Date;
}

export interface ClusterGoal {
  id: string;
  clusterId: string;
  goal: any; // JSON data
  createdAt: Date;
  updatedAt: Date;
}
