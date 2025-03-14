export interface Cluster {
  id: string;
  inputHash: string;
  clusterResult: any; // JSON data
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  tasks?: Array<{
    id: string;
    title: string;
  }>;
  children?: Goal[];
}

export interface ClusterWithGoals extends Cluster {
  title: string;
  description: string;
  urls: string[];
  goals: Goal[];
}

export interface ClusterGoal {
  id: string;
  clusterId: string;
  goal: any; // JSON data
  createdAt: Date;
  updatedAt: Date;
}

export interface UrlHistory {
  url: string; // Primary key
  title: string;
  descriptive_representation: string;
  embedding: number[]; // JSON data
  created_at: Date;
  updated_at: Date;
}
