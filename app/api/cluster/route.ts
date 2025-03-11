import { NextRequest, NextResponse } from "next/server";
import { fetchChromeHistory, processHistoryForClustering } from "../tools/history_tool";
import { clusterUrls } from "../tools/cluster_tool";
import { OpenAI } from "openai";
import { db, generateInputHash } from "../../db";
import { Cluster as DBCluster } from "../../db/types";

// Interface for cluster data returned by clusterUrls and this endpoint
export interface Cluster {
  name: string;
  description: string;
  urls: string[];
  count: number;
  status?: string; // Was previously called "label", renamed for clarity
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fetchHistory = false, 
      maxItems = 50, 
      urls = [], 
      baseUrl = "" 
    } = body;

    // Generate hash of input parameters for cache lookup
    const inputHash = generateInputHash({
      fetchHistory,
      maxItems,
      urls,
      baseUrl
    });

    // Check cache first
    const cachedResult = await db.clusters.findByInputHash(inputHash);
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        clusters: cachedResult.clusterResult,
        cached: true
      });
    }

    // Initialize OpenAI client
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let urlsToCluster: { url: string; title: string }[] = [];

    // If fetchHistory is true, call fetchChromeHistory from history_tool.ts
    if (fetchHistory) {
      const historyItems = await fetchChromeHistory(maxItems);
      // Process history items to prepare them for clustering
      urlsToCluster = processHistoryForClustering(historyItems);
    } else {
      // Otherwise, use the urls provided in the request
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json(
          { success: false, error: "No URLs provided" },
          { status: 400 }
        );
      }
      
      // Ensure the URLs are in the expected format
      urlsToCluster = urls.map(url => {
        if (typeof url === 'string') {
          return { url, title: url };
        } else if (typeof url === 'object' && url.url) {
          return { url: url.url, title: url.title || url.url };
        } else {
          return { url: String(url), title: String(url) };
        }
      });
    }

    // Pass the dataset to clusterUrls from cluster_tool.ts
    const clusterResult = await clusterUrls(
      baseUrl || urlsToCluster[0]?.url || "",
      urlsToCluster.length,
      openaiClient,
      urlsToCluster
    );

    // Transform the result into the expected format for this endpoint
    const clusters = Object.entries(clusterResult.clusterAnalysis)
      .filter(([clusterId]) => clusterId !== "-1") // Optionally filter out noise
      .map(([, clusterData]) => {
        const cluster = clusterData as Cluster;
        // Set status based on the cluster name
        cluster.status = cluster.name;
        return cluster;
      });

    // Store result in database
    await db.clusters.create({
      inputHash,
      clusterResult: clusters
    });

    return NextResponse.json({
      success: true,
      clusters,
      cached: false
    });
  } catch (error) {
    console.error("Error clustering URLs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cluster URLs" },
      { status: 500 }
    );
  }
}
