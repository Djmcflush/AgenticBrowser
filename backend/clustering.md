## URL Clustering Process

This document outlines the process for clustering URLs based on their content and topic.

### 1. Firecrawl the Website

The first step is to crawl the target website to extract URLs and their content. We use the Browserbase API to perform this crawl, which allows us to:

- Start from a base URL
- Extract a specified number of URLs (configurable, default: 20)
- Extract the content, title, and metadata from each page
- Handle pagination and navigation automatically

The crawled data includes:
- URL
- Page title
- Page content (HTML stripped)
- Meta description (if available)

### 2. Generate Descriptive Representation

For each crawled URL, we generate a detailed description of what the page is about. This is done using OpenAI's GPT-4 model, which:

- Analyzes the URL, title, and content
- Creates a concise (100-200 word) description focusing on the main topic and purpose
- Captures the key information and themes of the page

This step transforms raw HTML content into semantic descriptions that better represent the meaning and purpose of each page.

### 3. Create Embeddings

We convert the descriptive representations into vector embeddings using OpenAI's text-embedding-3-small model. These embeddings:

- Represent the semantic meaning of each page in a high-dimensional vector space
- Allow for mathematical comparison of page similarity
- Capture the topical relationships between different pages

Each embedding is a vector of floating-point numbers that represents the semantic content of the page.

### 4. Create Clusters with DBScan

We use the DBScan (Density-Based Spatial Clustering of Applications with Noise) algorithm to group similar pages based on their embeddings. DBScan:

- Groups pages that are close to each other in the embedding space
- Identifies outliers that don't belong to any cluster
- Automatically determines the number of clusters based on the data
- Uses two main parameters:
  - Epsilon (ε): The maximum distance between two points to be considered neighbors
  - MinPoints: The minimum number of points required to form a dense region

The result is a set of clusters, where each URL is assigned to a specific cluster (or marked as noise if it doesn't fit into any cluster).

### 5. Analyze Clusters

Finally, we analyze each cluster to understand what the pages within it have in common. For each cluster, we:

- Generate a short, descriptive name (3-5 words)
- Create a detailed description of what the pages in the cluster have in common
- List all URLs belonging to the cluster
- Count the number of pages in the cluster

This analysis provides insights into the topical structure of the website and how its content is organized.

### API Usage

The clustering functionality is available through a REST API endpoint:

- **Endpoint**: `/api/cluster_agent`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "baseUrl": "https://example.com",
    "maxUrls": 20
  }
  ```
- **Response**: JSON object containing the clustering results, including:
  - Base URL
  - Total number of URLs crawled
  - Total number of clusters found
  - Detailed analysis of each cluster

### Example Response

```json
{
  "baseUrl": "https://example.com",
  "totalUrls": 20,
  "totalClusters": 3,
  "clusterAnalysis": {
    "0": {
      "name": "Product Documentation",
      "description": "These pages provide detailed documentation for various products, including installation guides, API references, and usage examples.",
      "urls": ["https://example.com/docs/product1", "https://example.com/docs/product2"],
      "count": 2
    },
    "1": {
      "name": "Company Information",
      "description": "These pages contain information about the company, including its history, mission, team members, and contact details.",
      "urls": ["https://example.com/about", "https://example.com/team", "https://example.com/contact"],
      "count": 3
    },
    "-1": {
      "name": "Noise",
      "description": "Points that do not belong to any cluster",
      "urls": ["https://example.com/terms", "https://example.com/privacy"],
      "count": 2
    }
  }
}
