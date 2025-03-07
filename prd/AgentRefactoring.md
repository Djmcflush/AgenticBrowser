# PRD: Agent Refactoring (Leveraging Existing Functions)

This document provides details on reorganizing the existing browser history–related endpoints without modifying the existing `app/api/agent/route.ts` or the tools in `app/api/tools/` (including `history_tool.ts`, `cluster_tool.ts`, and `firecrawlTool.ts`). These new or updated routes will leverage the existing functions exported by those tools rather than rewriting or duplicating their logic. Below, we also provide example requests and responses for clarity.

---

## 1. Preservation of Existing Files

1. **`app/api/agent/route.ts`** must remain untouched.  
2. **Tools in `app/api/tools/`**—i.e., `history_tool.ts`, `cluster_tool.ts`, `firecrawlTool.ts`—are also off-limits for changes. We simply call the functions they already export without rewriting or duplicating any logic.

---

## 2. Goals

1. Expose a single endpoint to fetch recent browser history.  
2. Expose a single endpoint to cluster browsers’ URLs (or user-provided URLs).  
3. Expose a single endpoint to generate actionable “goals” based on the resulting clusters, using existing AI logic where relevant.  
4. Provide optional batch capabilities for clustering or goals.  
5. Refrain from duplicating code in the routes—call the existing functions (e.g., `fetchChromeHistory`, `clusterUrls`) directly rather than reimplementing anything.

---

## 3. Proposed Endpoints

### 3.1. GET /api/history  
• **Purpose**: Return recent browser history.  
• **Query Parameters**  
  - `maxItems` = number of history items to fetch (default 50).  
• **Implementation**  
  - Directly calls the function `fetchChromeHistory(maxItems)` from `history_tool.ts`.  
  - Returns the result as JSON.  

#### Example Request
```
GET /api/history?maxItems=25
```

#### Example Response
```json
{
  "success": true,
  "count": 25,
  "history": [
    {
      "url": "https://www.example.com",
      "title": "Example",
      "lastVisitTime": 1680218432000,
      "visitCount": 3
    },
    ...
  ]
}
```

---

### 3.2. POST /api/cluster  
• **Purpose**: Cluster either fetched browser history or user-provided URLs using, for example, `clusterUrls` in `cluster_tool.ts`.  
• **Request Body**  
  - `fetchHistory` (boolean) – if true, fetch N items of history first.  
  - `maxItems` (optional, default=50).  
  - `urls` (array, optional) – user-provided URLs to cluster if `fetchHistory` is false.  
  - `baseUrl` (optional) – an anchor for certain cluster logic.  
• **Implementation**  
  - If `fetchHistory` is true, calls `fetchChromeHistory` from `history_tool.ts`. Otherwise, uses the `urls` from the request.  
  - Passes this dataset to `clusterUrls` from `cluster_tool.ts`.  
  - Returns the clustered result as JSON, no duplication of logic from the tool.  

#### Example Request
```http
POST /api/cluster
Content-Type: application/json

{
  "fetchHistory": true,
  "maxItems": 10
}
```
(This would fetch 10 history items, cluster them, and return the result.)

#### Example Response
```json
{
  "success": true,
  "clusters": [
    {
      "label": "News Sites",
      "urls": [
        "https://news.ycombinator.com",
        "https://cnn.com"
      ]
    },
    {
      "label": "Social Media",
      "urls": [
        "https://twitter.com",
        "https://instagram.com"
      ]
    }
  ]
}
```
---

### 3.3. POST /api/cluster-goals  
• **Purpose**: Generate actionable tasks or goals for each cluster, leveraging an existing AI approach.  
• **Request Body**  
  - `clusterGoals` (string) – user instructions for how to interpret each cluster.  
  - `clusters` (array) – array of cluster objects to analyze.  
  - `batch` (boolean, optional) – if true, handle multiple cluster sets in one request.  
• **Implementation**  
  - Receives data in the request.  
  - Uses a new or existing function (e.g. `generateGoalsForClusters`) that calls the AI logic.  
  - Returns an array of items enumerating tasks like “purchase flight,” “create itinerary,” etc.  

#### Example Request
```http
POST /api/cluster-goals
Content-Type: application/json

{
  "clusterGoals": "Suggest practical steps for each cluster",
  "clusters": [
    {
      "label": "Travel to Mexico",
      "urls": [
        "https://www.visitmexico.com",
        "https://www.tripadvisor.com/Tourism-g150768-Mexico-Vacations.html"
      ]
    }
  ]
}
```

#### Example Response
```json
{
  "success": true,
  "goalsPerCluster": [
    {
      "label": "Travel to Mexico",
      "goals": [
        "Plan a 5-day itinerary for Mexico City and Cancún",
        "Find flights via google.com/flights or a similar service",
        "Budget accommodations near downtown Mexico City"
      ]
    }
  ]
}
```

**No Changes to Tools**  
We do not modify or wrap files such as `firecrawlTool.ts` or `cluster_tool.ts` or `history_tool.ts`. We simply import and use the exposed functions.

---

## 4. Endpoint Example Format

A new `app/api/cluster_goals/route.ts` might look like:

```ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clusterGoals, clusters, batch = false } = body;

    // Validate input
    if (!clusters || !Array.isArray(clusters)) {
      return NextResponse.json(
        { success: false, error: "No clusters provided" },
        { status: 400 }
      );
    }

    // Use existing AI logic (no modifications to the AI tools) to create goals
    const goalsPerCluster = await generateGoalsForClusters(clusters, clusterGoals, batch);

    return NextResponse.json({ success: true, goalsPerCluster });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to generate cluster goals" },
      { status: 500 }
    );
  }
}
```
**Key Point**: We do not copy or alter logic from `history_tool.ts`, `cluster_tool.ts`, or `firecrawlTool.ts`. We just call them from here.

---

## 5. Benefits of This Approach

1. **No Tool Rewrites**  
   - Minimizes risk of bugs or regressions by preserving `app/api/tools/*` exactly as is (including `firecrawlTool.ts`).  
2. **No Route Overlaps**  
   - Clear separation among fetching history (`/api/history`), clustering (`/api/cluster`), and generating goals (`/api/cluster-goals`).  
3. **Flexible**  
   - Users can fetch, cluster, and produce goals in stages or combine them as needed.  
4. **Batched Processing**  
   - Options for bigger workloads in one call, especially for the goals route.  
5. **Scalable & Maintainable**  
   - Adheres to DRY principles, calling existing functions (like `clusterUrls`) instead of rewriting.

---

## 6. Migration Steps

1. **Create or finalize new routes**  
   - `/api/history`, `/api/cluster`, `/api/cluster_goals`.  
2. **Refactor or remove older routes**  
   - Except `app/api/agent/route.ts`, which we must not touch.  
   - Keep the original `app/api/tools/` code (including `firecrawlTool.ts`) intact.  
3. **Testing & Validation**  
   - Confirm each new route calls the existing functions.  
   - Ensure the new endpoints work as expected for different input scenarios (e.g., fetch vs. user-provided URLs).

---

## 7. Conclusion

By using the existing tools’ functions (`fetchChromeHistory`, `clusterUrls`, or other relevant methods in `firecrawlTool.ts`) directly within new routes—without altering them—we avoid duplicating any logic. This ensures minimal disruption, preserves the proven code in `app/api/tools/`, and clarifies the codebase with distinct routes for history fetching, clustering, and generating AI-based cluster goals. Meanwhile, `app/api/agent/route.ts` remains untouched, as required.
