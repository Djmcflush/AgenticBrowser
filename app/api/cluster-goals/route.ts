import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { Cluster } from "../cluster/route";
import { db } from "../../db";
import { ClusterGoal as DBClusterGoal } from "../../db/types";

// Interface extending clusters with goals
interface ClusterWithGoals extends Cluster {
  goals: string[];
}

/**
 * Generates actionable goals for a given cluster using OpenAI
 * @param cluster The cluster data including name, description, status and URLs
 * @param clusterGoals User instructions for how to interpret the cluster
 * @param openaiClient OpenAI client instance
 * @returns Cluster with generated goals
 */
async function generateGoalsForCluster(
  cluster: Cluster,
  clusterGoals: string,
  openaiClient: OpenAI
): Promise<ClusterWithGoals> {
  try {
    // Format the URLs for inclusion in the prompt
    const formattedUrls = cluster.urls.map(url => `- ${url}`).join("\n");
    
    // Generate goals using OpenAI
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI that analyzes clusters of URLs to generate actionable goals or tasks that a user might want to accomplish based on their browsing patterns."
        },
        {
          role: "user",
          content: `Given the following cluster name and URLs, suggest 3-5 practical, actionable goals or tasks that align with the user's instruction: "${clusterGoals}".
          
          Cluster Name: ${cluster.name}
          Cluster Description: ${cluster.description}

          URLs in this cluster:
          ${formattedUrls}

          Provide specific, actionable items as a list. Focus on concrete tasks rather than vague suggestions.`
        }
      ],
      max_tokens: 500
    });
    
    // Extract and parse the generated goals
    const completionText = response.choices[0]?.message?.content || "";
    
    // Extract goals from the completion text (assuming they're in a list format)
    const goalLines = completionText
      .split("\n")
      .filter(line => line.trim().match(/^[-*\d.]\s+/))  // Lines that start with list markers
      .map(line => line.replace(/^[-*\d.]\s+/, "").trim());  // Remove list markers
    
    // Fallback if no list items were detected
    const goals = goalLines.length > 0 
      ? goalLines 
      : [completionText.split("\n")[0]]; // Just use the first line as a fallback
    
    return {
      ...cluster,  // Spread all properties from the original cluster
      goals,       // Add the goals
      status: "Complete"
    };
  } catch (error) {
    console.error(`Error generating goals for cluster "${cluster.name}":`, error);
    return {
      ...cluster,  // Spread all properties from the original cluster
      goals: ["Error generating goals for this cluster"],
      status: "Failed"
    };
  }
}

/**
 * Generates goals for multiple clusters
 * @param clusters Array of clusters to generate goals for
 * @param clusterGoals User instructions for how to interpret the clusters
 * @param openaiClient OpenAI client instance
 * @returns Array of clusters with generated goals
 */
async function generateGoalsForClusters(
  clusters: Cluster[],
  clusterGoals: string,
  batch: boolean = false
): Promise<ClusterWithGoals[]> {
  // Initialize OpenAI client
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  if (batch) {
    // Process all clusters in parallel for batch mode
    const promises = clusters.map(cluster => 
      generateGoalsForCluster(cluster, clusterGoals, openaiClient)
    );
    return await Promise.all(promises);
  } else {
    // Process clusters sequentially
    const results: ClusterWithGoals[] = [];
    for (const cluster of clusters) {
      const result = await generateGoalsForCluster(cluster, clusterGoals, openaiClient);
      results.push(result);
    }
    return results;
  }
}

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

    if (!clusterGoals || typeof clusterGoals !== "string") {
      return NextResponse.json(
        { success: false, error: "No cluster goals instructions provided" },
        { status: 400 }
      );
    }

    // Check cache for each cluster's goals
    const goalsPerCluster = [];
    for (const cluster of clusters) {
      // Try to find cached goals
      const cachedGoals = await db.clusterGoals.findByClusterId(cluster.id);
      if (cachedGoals) {
        goalsPerCluster.push({
          ...cluster,
          goals: cachedGoals.goal,
          status: "Complete",
          cached: true
        });
      } else {
        // Generate new goals if not in cache
        const clusterWithGoals = await generateGoalsForCluster(cluster, clusterGoals, new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        }));

        // Store goals in database
        await db.clusterGoals.create({
          clusterId: cluster.id,
          goal: clusterWithGoals.goals
        });

        goalsPerCluster.push({
          ...clusterWithGoals,
          cached: false
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      goalsPerCluster 
    });
  } catch (error) {
    console.error("Error generating cluster goals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate cluster goals" },
      { status: 500 }
    );
  }
}
