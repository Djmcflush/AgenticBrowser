# Bubble-Cluster Integration PRD

## Overview
This document outlines the plan for integrating the “bubble-cluster” and “goal-hierarchy” components with the main application’s data model. It details how data flows from the existing “/api/cluster” and “/api/cluster-goals” routes, how the “Cluster” and “ClusterGoal” entities will be used from “app/db/types.ts,” and how “page.tsx” will render and manage clusters via BubbleCluster.

---

## Objectives
1. Provide a visual, interactive representation of Clusters and their associated Goals.
2. Allow users to toggle details and rename Clusters.
3. Use the existing endpoints and data structures to avoid additional backend work.

---

## Data Sources
- Routes:  
  - /api/cluster: Provides base Cluster information.  
  - /api/cluster-goals: Provides merged structures for each Cluster with an array of associated Goals.  

- Types (app/db/types.ts):  
  - Cluster:  
    - id, inputHash  
    - clusterResult (JSON storing fields like title, description, urls, etc.)  
  - ClusterGoal:  
    - id, clusterId  
    - goal (JSON storing the goal object)  

These data structures are combined or transformed as needed to provide a single object in the UI that includes:
• title, description, any “urls” array, plus a “goals” array.

---

## Components to Integrate

### BubbleCluster

• Displays a visual card for each Cluster.  
• Has “onClick” to select or highlight a cluster, with an “isSelected” prop controlling whether it’s highlighted.  
• Has “onRename” to trigger rename logic for the cluster’s title.  
• When goals are shown, uses the GoalHierarchy component underneath.  

### GoalHierarchy

• Renders nested goals (with tasks and child goals).  
• Accepts “goals” in the shape <code>Goal[]</code>, each potentially having “children” and “tasks.”  
• References a lucide-react icon (CheckCircle2) for tasks.

---

## Integration Steps

1. Fetch Data in page.tsx  
   - Call “/api/cluster-goals” to retrieve a combined list of clusters (perhaps returned as “ClusterWithGoals”).  
   - Each entry includes a cluster plus the goals array.  

2. Convert the JSON Fields for UI  
   - The cluster’s “clusterResult” should be parsed into a typed object containing:
     - <code>title</code>, <code>description</code>, <code>urls</code>, etc.  
   - The goals might be stored in <code>ClusterGoal.goal</code>. Convert them into an array shape that matches BubbleCluster’s <code>cluster.goals</code> property.  

3. Render BubbleCluster in page.tsx  
   - For each item in the fetched data:
     - <code><BubbleCluster  
        key=&#123;cluster.id&#125;  
        cluster=&#123;parsedCluster&#125;  
        onClick=&#123;onSelectCluster&#125;  
        onRename=&#123;onRenameCluster&#125;  
        isSelected=&#123;selectedClusterId === cluster.id&#125;  
       /></code>  
   - Provide state logic and handlers for:
     - <code>isSelected</code> toggling, so the cluster’s goals appear.
     - <code>onRenameCluster</code> that only updates the card’s title in the UI for now, with no backend call. We can later add a rename endpoint if needed.

4. Use app/db/types.ts  
   - Replace any import from “@/lib/types” with “app/db/types” to maintain consistency.  
   - Keep any shape expansions (like a <code>ClusterWithGoals</code> interface) by placing it in the route definition or a shared location, but rely on the base “Cluster” and “ClusterGoal” from app/db/types.

5. No New Endpoints Needed  
   - We will leverage “app/api/cluster-goals/route.ts” to retrieve everything.  
   - Rename is currently UI-only. We can add an endpoint in the future if needed.

---

## UI/UX Details
1. Cluster Card
   - Displays a background image, cluster title, and short description.  
   - Button (ChevronUp/ChevronDown) toggles the goal list.  

2. Goals Expansion
   - If “showGoals” is true, the BubbleCluster component reveals a container that uses GoalHierarchy to visualize the nested goals.  

3. Editing Operations
   - Right-click or contextual menu for “Rename Cluster,” “Create Goals,” or “View URLs.”  
   - “Rename” triggers a dialog. The new title is saved to the DB via your chosen endpoint and re-fetch or re-render as needed.

---

## Implementation Timeline
• Phase 1: Update page.tsx to fetch cluster data from “/api/cluster-goals.”  
• Phase 2: Wire up BubbleCluster’s “onRename” and “onClick” to local state and the rename endpoints.  
• Phase 3: Confirm final data shape in UI matches the stored JSON in “clusterResult” and “ClusterGoal.goal.”  
• Phase 4: Final testing to ensure toggling goals and rename flows work seamlessly.

---

## Conclusion
With this approach, we ensure the BubbleCluster and GoalHierarchy components fully integrate into page.tsx using the existing endpoints, referencing “app/db/types” for consistency and parsing the JSON fields from the DB to meet the UI’s needs.
