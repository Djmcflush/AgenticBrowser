import { NextRequest, NextResponse } from "next/server";
import { fetchChromeHistory, processHistoryForClustering } from "../tools/history_tool";
import { generateDescriptiveRepresentations, createEmbeddings } from "../tools/cluster_tool";
import { OpenAI } from "openai";

export async function GET(request: NextRequest) {
  try {
    // Get maxItems from query parameters, default to 50 if not provided
    const searchParams = request.nextUrl.searchParams;
    const maxItems = searchParams.get("maxItems") 
      ? parseInt(searchParams.get("maxItems") as string) 
      : 100;

    // Directly call the fetchChromeHistory function from history_tool.ts
    const history = await fetchChromeHistory(maxItems);

    // Process history items for embedding and storage (similar to the cluster endpoint)
    if (history.length > 0) {
      try {
        // Initialize OpenAI client
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        // Process history items to prepare them for representation and embedding
        const processedUrls = processHistoryForClustering(history);
        
        // Convert to the format expected by generateDescriptiveRepresentations
        const urlDataArray = processedUrls.map(item => ({
          url: item.url,
          title: item.title || "",
          content: "", // We don't have content from history items
          description: ""
        }));

        // Generate descriptions (this will store them in the database)
        const enhancedUrlData = await generateDescriptiveRepresentations(urlDataArray, openaiClient);
        
        // Create embeddings (this will update the database with embeddings)
        await createEmbeddings(enhancedUrlData, openaiClient);

        console.log(`Processed ${history.length} history items for database storage`);
      } catch (processingError) {
        // If processing fails, log the error but still return the history
        // This ensures the API remains functional even if OpenAI is unavailable
        console.error("Error processing history for database storage:", processingError);
      }
    } else {
      console.log("No history items to process - skipping database storage");
    }

    return NextResponse.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error("Error fetching browser history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch browser history" },
      { status: 500 }
    );
  }
}
