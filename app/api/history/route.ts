import { NextRequest, NextResponse } from "next/server";
import { fetchChromeHistory } from "../tools/history_tool";

export async function GET(request: NextRequest) {
  try {
    // Get maxItems from query parameters, default to 50 if not provided
    const searchParams = request.nextUrl.searchParams;
    const maxItems = searchParams.get("maxItems") 
      ? parseInt(searchParams.get("maxItems") as string) 
      : 50;

    // Directly call the fetchChromeHistory function from history_tool.ts
    const history = await fetchChromeHistory(maxItems);

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
