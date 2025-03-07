import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { OpenAIToolSet } from "composio-core";
import { z } from "zod";

/**
 * Interface for history item returned from Chrome
 */
export interface HistoryItem {
  url: string;
  title: string;
  lastVisitTime: string;
  visitCount: number;
}

/**
 * Interface for Chrome history database row
 */
interface ChromeHistoryRow {
  url: string;
  title: string;
  last_visit_time: number;
  visit_count: number;
}

/**
 * Gets the path to Chrome's History SQLite database based on the operating system
 * @returns Path to Chrome's History database
 */
function getChromeHistoryPath(): string {
  const platform = process.platform;
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'win32': // Windows
      const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
      return path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'History');
      
    case 'darwin': // macOS
      return path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'History');
      
    case 'linux': // Linux
      return path.join(homeDir, '.config', 'google-chrome', 'Default', 'History');
      
    default:
      throw new Error(`Unsupported operating system: ${platform}`);
  }
}

/**
 * Converts Chrome's WebKit timestamp (microseconds since Jan 1, 1601) to ISO string
 * @param webkitTimestamp Chrome's internal timestamp format
 * @returns ISO formatted date string
 */
function convertChromeTimestamp(webkitTimestamp: number): string {
  // Chrome timestamps are microseconds since Jan 1, 1601
  // Need to convert to milliseconds since Jan 1, 1970 (Unix epoch)
  const epochDifferenceInMicroseconds = 11644473600000000; // Difference between 1601 and 1970 in microseconds
  const unixTimestampInMilliseconds = (webkitTimestamp - epochDifferenceInMicroseconds) / 1000;
  
  return new Date(unixTimestampInMilliseconds).toISOString();
}

/**
 * Fetches browser history directly from Chrome's SQLite database
 * @param maxItems Maximum number of history items to fetch (default: 50)
 * @returns Array of history items
 */
export async function fetchChromeHistory(
  maxItems: number = 50
): Promise<HistoryItem[]> {
  try {
    console.log("Fetching Chrome history from local database...");
    
    // Get the path to Chrome's History database
    const historyPath = getChromeHistoryPath();
    
    // Check if the file exists
    if (!fs.existsSync(historyPath)) {
      console.error(`Chrome History file not found at: ${historyPath}`);
      return [];
    }
    
    // Create a temporary copy of the database to avoid file locks
    const tempDbPath = path.join(os.tmpdir(), `chrome_history_${Date.now()}.db`);
    fs.copyFileSync(historyPath, tempDbPath);
    
    try {
      // Open the database in read-only mode
      const db = new Database(tempDbPath, { readonly: true });
      
      // Query the database for recent history
      const query = `
        SELECT url, title, last_visit_time, visit_count
        FROM urls
        ORDER BY last_visit_time DESC
        LIMIT ?
      `;
      
      const rows = db.prepare(query).all(maxItems);
      
      // Close the database connection
      db.close();
      
      // Convert the rows to HistoryItem format
      const historyItems: HistoryItem[] = (rows as ChromeHistoryRow[]).map(row => ({
        url: row.url,
        title: row.title || extractDomainFromUrl(row.url),
        lastVisitTime: convertChromeTimestamp(row.last_visit_time),
        visitCount: row.visit_count
      }));
      
      console.log(`Successfully fetched ${historyItems.length} history items`);
      
      return historyItems;
    } finally {
      // Clean up the temporary file
      try {
        if (fs.existsSync(tempDbPath)) {
          fs.unlinkSync(tempDbPath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary database file:", cleanupError);
      }
    }
  } catch (error) {
    console.error("Error fetching Chrome history:", error);
    
    // If there's an error (like the database is locked), return an empty array
    // rather than throwing an exception to maintain API stability
    return [];
  }
}

/**
 * Processes history items to prepare them for clustering
 * @param historyItems Array of history items
 * @returns Array of objects with url and title properties
 */
export function processHistoryForClustering(historyItems: HistoryItem[]): { url: string, title: string }[] {
  return historyItems.map(item => ({
    url: item.url,
    title: item.title || extractDomainFromUrl(item.url),
  }));
}

/**
 * Extracts the domain from a URL
 * @param url URL to extract domain from
 * @returns Domain name
 */
function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
}

/**
 * Creates a Composio tool for fetching Chrome history
 * @returns Promise with the configured tool
 */
export async function createChromeHistoryTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    maxItems: z.number().optional().describe("Maximum number of history items to fetch (default: 50)")
  });
  
  // Create a custom tool for fetching Chrome history
  await toolset.createAction({
    actionName: "getChromeHistory",
    description: "Fetch browser history from Chrome",
    inputParams: inputSchema,
    callback: async (inputParams: z.infer<typeof inputSchema>, authCredentials, executeRequest) => {
      const maxItems = inputParams.maxItems || 50;
      const historyItems = await fetchChromeHistory(maxItems);
      
      // Return in the format expected by Composio
      return {
        data: { items: historyItems },
        successful: true
      };
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["getChromeHistory"]
  });
}
