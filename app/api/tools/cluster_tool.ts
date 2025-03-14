import { OpenAI } from "openai";
import axios from "axios";
// math library import removed as we're using built-in Math object
import { OpenAIToolSet } from "composio-core";
import { z } from "zod";
import { crawlWebsite } from "./firecrawlTool";
import { db } from "../../db";
// Interface for URL data
interface UrlData {
  url: string;
  title: string;
  content: string;
  description: string;
}

// Interface for embedding data
interface EmbeddingData extends UrlData {
  embedding: number[];
}

// Interface for clustered data
interface ClusteredData extends EmbeddingData {
  cluster: number;
}
/**
 * Generate descriptive representations of URL content using OpenAI
 * @param urlDataArray Array of URL data objects
 * @param openaiClient OpenAI client instance
 * @returns Array of URL data objects with enhanced descriptions
 */
export async function generateDescriptiveRepresentations(
  urlDataArray: UrlData[],
  openaiClient: OpenAI
): Promise<UrlData[]> {
  console.log("Generating descriptive representations...");
  
  const enhancedUrlData: UrlData[] = [];
  const urlsToProcess: UrlData[] = [];
  const urlsMap = new Map<string, UrlData>();
  
  // First, check which URLs already have descriptions in the database
  const urls = urlDataArray.map(data => data.url);
  const existingEntries = await db.urlHistory.batchFindByUrls(urls);
  
  console.log(`Found ${existingEntries.length} existing descriptions in the database.`);
  
  // Create a map for quick lookup
  const existingEntriesMap = new Map(
    existingEntries.map(entry => [entry.url, entry])
  );
  
    // Process each URL, using cached descriptions when available
    for (const urlData of urlDataArray) {
      const existingEntry = existingEntriesMap.get(urlData.url);
      
      // If we have a cached description, use it
      if (existingEntry && existingEntry.descriptive_representation) {
        console.log(`Using cached description for ${urlData.url}`);
        enhancedUrlData.push({
          ...urlData,
          description: existingEntry.descriptive_representation
        });
      } 
    // Otherwise add to the list of URLs to process
    else {
      // Skip if there's no content to analyze
      if (!urlData.content && !urlData.title) {
        console.warn(`Skipping ${urlData.url} due to lack of content`);
        enhancedUrlData.push(urlData);
        continue;
      }
      
      urlsToProcess.push(urlData);
      urlsMap.set(urlData.url, urlData);
    }
  }
  
  console.log(`Need to generate descriptions for ${urlsToProcess.length} URLs.`);
  
  // Process URLs that need new descriptions
  for (const urlData of urlsToProcess) {
    try {
      // Prepare content for analysis (limit length to avoid token limits)
      const contentToAnalyze = `
        URL: ${urlData.url}
        Title: ${urlData.title}
        Content: ${urlData.content.substring(0, 20000)}...
      `;
      
      // Generate a descriptive representation using OpenAI
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI that creates concise, detailed descriptions of web pages. Focus on the main topic, purpose, and key information presented on the page."
          },
          {
            role: "user",
            content: `Please create a detailed description (50-200 words) of what this web page is about based on the following information:\n${contentToAnalyze}`
          }
        ],
        max_tokens: 300
      });
      
      // Extract the generated description
      const generatedDescription = response.choices[0]?.message?.content || "";
      
      // Add the enhanced description to the URL data
      enhancedUrlData.push({
        ...urlData,
        description: generatedDescription
      });
      
      // Store the generated description in the database (without embedding yet)
      await db.urlHistory.create({
        url: urlData.url,
        title: urlData.title,
        descriptive_representation: generatedDescription,
        embedding: [] // Empty array for now, will be updated later
      });
      
      console.log(`Generated and stored description for ${urlData.url}`);
    } catch (error) {
      console.error(`Error generating description for ${urlData.url}:`, error);
      // Keep the original data if there's an error
      enhancedUrlData.push(urlData);
    }
  }
  
  console.log("Descriptive representation generation completed.");
  return enhancedUrlData;
}

/**
 * Create embeddings for URL descriptions using OpenAI
 * @param urlDataArray Array of URL data objects with descriptions
 * @param openaiClient OpenAI client instance
 * @returns Array of URL data objects with embeddings
 */
export async function createEmbeddings(
  urlDataArray: UrlData[],
  openaiClient: OpenAI
): Promise<EmbeddingData[]> {
  console.log("Creating embeddings...");
  
  const embeddingDataArray: EmbeddingData[] = [];
  const urlsToProcess: UrlData[] = [];
  
  // First, check which URLs already have embeddings in the database
  const urls = urlDataArray.map(data => data.url);
  const existingEntries = await db.urlHistory.batchFindByUrls(urls);
  
  console.log(`Found ${existingEntries.length} URLs in the database.`);
  
  // Create a map for quick lookup
  const existingEntriesMap = new Map(
    existingEntries.map(entry => [entry.url, entry])
  );
  
  // Process each URL, using cached embeddings when available
  for (const urlData of urlDataArray) {
    const existingEntry = existingEntriesMap.get(urlData.url);
    
    // Skip if there's no description to embed
    if (!urlData.description) {
      console.warn(`Skipping embedding for ${urlData.url} due to lack of description`);
      continue;
    }
    
    // If we have a cached embedding, use it
    if (existingEntry && existingEntry.embedding && Array.isArray(existingEntry.embedding) && existingEntry.embedding.length > 0) {
      console.log(`Using cached embedding for ${urlData.url}`);
      embeddingDataArray.push({
        ...urlData,
        embedding: existingEntry.embedding
      });
      continue;
    }
    // Otherwise add to the list of URLs to process
    else {
      urlsToProcess.push(urlData);
    }
  }
  
  console.log(`Need to generate embeddings for ${urlsToProcess.length} URLs.`);
  
  // Process URLs that need new embeddings
  const batchUpdateData = [];
  
  for (const urlData of urlsToProcess) {
    try {
      // Generate embedding using OpenAI
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: urlData.description
      });
      
      // Extract the embedding
      const embedding = response.data[0]?.embedding;
      
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }
      
      // Add the embedding to the URL data
      embeddingDataArray.push({
        ...urlData,
        embedding
      });
      
      // Store the embedding in the database
      batchUpdateData.push({
        url: urlData.url,
        title: urlData.title,
        descriptive_representation: urlData.description,
        embedding: embedding
      });
      
      console.log(`Created embedding for ${urlData.url}`);
    } catch (error) {
      console.error(`Error creating embedding for ${urlData.url}:`, error);
    }
  }
  
  // Batch update the database
  if (batchUpdateData.length > 0) {
    try {
      await db.urlHistory.batchCreate(batchUpdateData);
      console.log(`Stored ${batchUpdateData.length} embeddings in the database.`);
    } catch (error) {
      console.error("Error storing embeddings in database:", error);
    }
  }
  
  console.log(`Embedding creation completed. Created/retrieved ${embeddingDataArray.length} embeddings.`);
  return embeddingDataArray;
}

/**
 * Calculate Euclidean distance between two vectors
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Euclidean distance
 */
function euclideanDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += Math.pow(vec1[i] - vec2[i], 2);
  }
  
  return Math.sqrt(sum);
}

/**
 * Perform DBScan clustering on embeddings
 * @param embeddingDataArray Array of URL data objects with embeddings
 * @param epsilon Distance threshold for DBScan (default: 0.2)
 * @param minPoints Minimum points to form a cluster (default: 2)
 * @returns Array of URL data objects with cluster assignments
 */
/**
 * Deduplicate URL data array based on URLs
 * @param urlDataArray Array of URL data objects
 * @returns Deduplicated array of URL data objects
 */
function deduplicateUrlData(urlDataArray: UrlData[]): UrlData[] {
  const seen = new Set<string>();
  return urlDataArray.filter(data => {
    if (seen.has(data.url)) {
      console.log(`Removing duplicate URL: ${data.url}`);
      return false;
    }
    seen.add(data.url);
    return true;
  });
}

export function createClusters(
  embeddingDataArray: EmbeddingData[],
  epsilon: number = 0.75,
  minPoints: number = 2
): ClusteredData[] {
  console.log(`Creating clusters with DBScan... Processing ${embeddingDataArray.length} embeddings with epsilon=${epsilon}, minPoints=${minPoints}`);
  
  // Initialize all points as unvisited (-1) and not part of any cluster (null)
  const visited: boolean[] = new Array(embeddingDataArray.length).fill(false);
  const clusteredData: ClusteredData[] = embeddingDataArray.map(data => ({
    ...data,
    cluster: -1 // -1 indicates noise (not part of any cluster)
  }));
  
  let currentCluster = 0;
  
  // Function to find neighbors within epsilon distance
  const findNeighbors = (pointIndex: number): number[] => {
    const neighbors: number[] = [];
    const point = embeddingDataArray[pointIndex].embedding;
    
    for (let i = 0; i < embeddingDataArray.length; i++) {
      if (i !== pointIndex) {
        const distance = euclideanDistance(point, embeddingDataArray[i].embedding);
        if (distance <= epsilon) {
          neighbors.push(i);
        }
      }
    }
    
    return neighbors;
  };
  
  // Expand cluster from a core point
  const expandCluster = (pointIndex: number, neighbors: number[], cluster: number) => {
    clusteredData[pointIndex].cluster = cluster;
    
    for (let i = 0; i < neighbors.length; i++) {
      const neighborIndex = neighbors[i];
      
      if (!visited[neighborIndex]) {
        visited[neighborIndex] = true;
        
        const neighborNeighbors = findNeighbors(neighborIndex);
        if (neighborNeighbors.length >= minPoints) {
          // Add new neighbors to the list
          neighbors.push(...neighborNeighbors.filter(n => !neighbors.includes(n) && n !== pointIndex));
        }
      }
      
      // If the neighbor is not yet part of any cluster, add it to the current cluster
      if (clusteredData[neighborIndex].cluster === -1) {
        clusteredData[neighborIndex].cluster = cluster;
      }
    }
  };
  
  // Main DBScan algorithm
  for (let i = 0; i < embeddingDataArray.length; i++) {
    if (visited[i]) continue;
    
    visited[i] = true;
    const neighbors = findNeighbors(i);
    
    if (neighbors.length < minPoints) {
      // Mark as noise
      clusteredData[i].cluster = -1;
    } else {
      // Start a new cluster
      expandCluster(i, neighbors, currentCluster);
      currentCluster++;
    }
  }
  
  // Count items in each cluster
  const clusterCounts = clusteredData.reduce((acc, item) => {
    acc[item.cluster] = (acc[item.cluster] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  // Log cluster distribution
  console.log(`Clustering completed. Found ${currentCluster} clusters.`);
  console.log('Cluster distribution:');
  Object.entries(clusterCounts).forEach(([clusterId, count]) => {
    console.log(`- Cluster ${clusterId}: ${count} items`);
  });
  
  return clusteredData;
}

/**
 * Analyze clusters to generate insights
 * @param clusteredData Array of URL data objects with cluster assignments
 * @param openaiClient OpenAI client instance
 * @returns Analysis of each cluster
 */
export async function analyzeClusters(
  clusteredData: ClusteredData[],
  openaiClient: OpenAI
): Promise<any> {
  console.log("Analyzing clusters...");
  
  // Group data by cluster
  const clusterGroups: { [key: number]: ClusteredData[] } = {};
  
  for (const data of clusteredData) {
    if (!clusterGroups[data.cluster]) {
      clusterGroups[data.cluster] = [];
    }
    clusterGroups[data.cluster].push(data);
  }
  
  const clusterAnalysis: any = {};
  
  // Analyze each cluster
  for (const [clusterIdStr, clusterData] of Object.entries(clusterGroups)) {
    const clusterId = parseInt(clusterIdStr);
    
    // Skip noise points (cluster -1)
    if (clusterId === -1) {
      clusterAnalysis[clusterId] = {
        name: "Noise",
        description: "Points that do not belong to any cluster",
        urls: clusterData.map(data => data.url),
        count: clusterData.length
      };
      continue;
    }
    
    try {
      // Prepare data for analysis
      const clusterDescriptions = clusterData.map(data => data.description).join("\n\n");
      const clusterUrls = clusterData.map(data => data.url);
      
      // Generate cluster analysis using OpenAI
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI that analyzes groups of web pages to identify common themes and topics."
          },
          {
            role: "user",
            content: `Analyze the following group of web page descriptions and provide:
            1. A short name for this group (3-5 words)
            2. A detailed description of what these pages have in common (50-100 words)
            
            Web page descriptions:
            ${clusterDescriptions}`
          }
        ],
        max_tokens: 300
      });
      
      // Parse the analysis
      const analysisText = response.choices[0]?.message?.content || "";
      
      // Extract name and description from the analysis
      const nameMatch = analysisText.match(/(?:name|Name|NAME):\s*(.*?)(?:\n|$)/);
      const descriptionMatch = analysisText.match(/(?:description|Description|DESCRIPTION):\s*([\s\S]*?)(?:\n\n|$)/);
      
      clusterAnalysis[clusterId] = {
        name: nameMatch ? nameMatch[1].trim() : `Cluster ${clusterId}`,
        description: descriptionMatch ? descriptionMatch[1].trim() : analysisText,
        urls: clusterUrls,
        count: clusterData.length
      };
      
      console.log(`Analyzed cluster ${clusterId}`);
    } catch (error) {
      console.error(`Error analyzing cluster ${clusterId}:`, error);
      clusterAnalysis[clusterId] = {
        name: `Cluster ${clusterId}`,
        description: "Error analyzing this cluster",
        urls: clusterData.map(data => data.url),
        count: clusterData.length
      };
    }
  }
  
  console.log("Cluster analysis completed.");
  return clusterAnalysis;
}

/**
 * Main function to cluster URLs based on their content
 * @param baseUrl The base URL to crawl
 * @param maxUrls Maximum number of URLs to crawl
 * @param openaiClient OpenAI client instance
 * @param preProcessedUrls Optional array of pre-processed URL data (bypasses firecrawl)
 * @returns Analysis of URL clusters
 */
export async function clusterUrls(
  baseUrl: string,
  maxUrls: number = 20,
  openaiClient: OpenAI,
  preProcessedUrls?: { url: string; title: string }[]
): Promise<any> {
  try {
    console.log(`Starting URL clustering process for ${baseUrl}`);
    
    // Step 1: Use pre-processed URLs if provided, otherwise firecrawl the website
    let rawUrlData = preProcessedUrls 
      ? preProcessedUrls.map(item => ({
          url: item.url,
          title: item.title || "",
          content: "",
          description: ""
        }))
      : await crawlWebsite(baseUrl, maxUrls);
    
    // Ensure urlDataArray is always an array of UrlData objects
    const urlDataArray: UrlData[] = Array.isArray(rawUrlData) 
      ? rawUrlData as UrlData[] 
      : typeof rawUrlData === 'string' 
        ? [{ url: baseUrl, title: baseUrl, content: rawUrlData, description: "" }]
        : [];
    
    // Step 2: Deduplicate URLs and generate descriptive representations
    const deduplicatedUrlData = deduplicateUrlData(urlDataArray);
    console.log(`Deduplicated URLs: ${urlDataArray.length} -> ${deduplicatedUrlData.length}`);
    const enhancedUrlData = await generateDescriptiveRepresentations(deduplicatedUrlData, openaiClient);
    
    // Step 3: Create embeddings
    const embeddingDataArray = await createEmbeddings(enhancedUrlData, openaiClient);
    
    // Step 4: Create clusters with DBScan
    // Default to a larger epsilon value of 0.75 to allow more inclusive clusters
    const clusteredData = createClusters(embeddingDataArray, 0.75);
    
    // Step 5: Analyze clusters
    const clusterAnalysis = await analyzeClusters(clusteredData, openaiClient);
    
    console.log("URL clustering process completed successfully.");
    
    return {
      baseUrl,
      totalUrls: urlDataArray.length,
      totalClusters: Object.keys(clusterAnalysis).filter(id => id !== "-1").length,
      clusterAnalysis
    };
  } catch (error) {
    console.error("Error in URL clustering process:", error);
    throw error;
  }
}

/**
 * Creates a Composio tool for clustering URLs
 * @returns Promise with the configured tool
 */
export async function createClusterTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    baseUrl: z.string().describe("The base URL to crawl"),
    maxUrls: z.number().optional().describe("Maximum number of URLs to crawl (default: 20)"),
    preProcessedUrls: z.array(
      z.object({
        url: z.string(),
        title: z.string().optional()
      })
    ).optional().describe("Optional array of pre-processed URL data (bypasses firecrawl)"),
    epsilon: z.number().optional().describe("Distance threshold for clustering (default: 0.1, smaller values create more clusters)")
  });
  
  // Create a custom tool for URL clustering
  await toolset.createAction({
    actionName: "clusterUrls",
    description: "Cluster URLs based on their content and generate insights",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      // Initialize OpenAI client
      const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Process preProcessedUrls to ensure title is always a string
      const processedUrls = params.preProcessedUrls?.map(item => ({
        url: item.url,
        title: item.title || ""
      }));
      
      // Call the clusterUrls function
      // First get the base URL, max URLs, and preprocessed URLs
      const baseUrl = params.baseUrl;
      const maxUrls = params.maxUrls || 20;
      
      // Extract the embedding parameters
      let epsilon = params.epsilon;
      
      // Define a custom clusterUrls function that allows passing the epsilon parameter
      const customClusterUrls = async () => {
        console.log(`Starting URL clustering process for ${baseUrl}`);
        
        // Step 1: Use pre-processed URLs if provided, otherwise firecrawl the website
        let rawUrlData = processedUrls 
          ? processedUrls.map(item => ({
              url: item.url,
              title: item.title || "",
              content: "",
              description: ""
            }))
          : await crawlWebsite(baseUrl, maxUrls);
        
        // Ensure urlDataArray is always an array of UrlData objects
        const urlDataArray: UrlData[] = Array.isArray(rawUrlData) 
          ? rawUrlData as UrlData[] 
          : typeof rawUrlData === 'string' 
            ? [{ url: baseUrl, title: baseUrl, content: rawUrlData, description: "" }]
            : [];
        
        // Step 2: Deduplicate URLs and generate descriptive representations
        const deduplicatedUrlData = deduplicateUrlData(urlDataArray);
        console.log(`Deduplicated URLs: ${urlDataArray.length} -> ${deduplicatedUrlData.length}`);
        const enhancedUrlData = await generateDescriptiveRepresentations(deduplicatedUrlData, openaiClient);
        
        // Step 3: Create embeddings
        const embeddingDataArray = await createEmbeddings(enhancedUrlData, openaiClient);
        
        // Step 4: Create clusters with DBScan
        // Use the provided epsilon or default to 0.75
        const epsilonValue = epsilon || 0.75;
        console.log(`Creating clusters with epsilon value: ${epsilonValue}. Lower values create more numerous, smaller clusters.`);
        const clusteredData = createClusters(embeddingDataArray, epsilonValue);
        
        // Step 5: Analyze clusters
        const clusterAnalysis = await analyzeClusters(clusteredData, openaiClient);
        
        console.log("URL clustering process completed successfully.");
        
        return {
          baseUrl,
          totalUrls: urlDataArray.length,
          totalClusters: Object.keys(clusterAnalysis).filter(id => id !== "-1").length,
          clusterAnalysis
        };
      };
      
      // Execute the custom clustering function
      const result = await customClusterUrls();
      
      // Return in the format expected by Composio
      return {
        data: { result },
        successful: true
      };
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["clusterUrls"]
  });
}
