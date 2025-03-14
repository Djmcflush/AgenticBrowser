# Chrome History API - Product Requirements Document

## Overview
This PRD outlines the proposed approach for reading a user's Chrome browser history via TypeScript, leveraging local file system access to Chrome's SQLite "History" file. The resulting solution will provide an API endpoint—suitable for use in a Next.js or Node-based application—that returns recent browser history entries in JSON format.

---

## Goals
1. Provide a TypeScript-based API (no Python dependencies) that can read the local Chrome "History" file.
2. Dynamically detect the current operating system (Windows, macOS, or Linux) to locate Chrome's SQLite database path.
3. Retrieve and return a configurable number of recent browsing history entries (URL, title, timestamp, etc.).
4. Ensure minimal friction for integration into existing Next.js or Node-based apps.

---

## Background and Motivation
Historically, attempts to read browser history have involved:
• Navigating to "chrome://history" via headless automation, which is restricted by Chrome.  
• Using external scripts to parse local system data.  

Chrome's actual history is stored in an SQLite database. This solution directly reads that database, giving greater control and reliability in returning relevant URLs.

---

## Technical Requirements

### Operating System Detection
• Use Node's `os.platform()` or `process.platform` to determine if the environment is Windows (`win32`), macOS (`darwin`), or Linux (`linux`).  
• Each OS requires a distinct path to the Chrome "History" file.  

Example default paths:
• **Windows**: %LocalAppData%\Google\Chrome\User Data\Default\History  
• **macOS**: ~/Library/Application Support/Google/Chrome/Default/History  
• **Linux**: ~/.config/google-chrome/Default/History  

### Database Interaction
• Adopt a TypeScript-friendly SQLite library, for example `better-sqlite3` or `sqlite3`.  
• Carefully handle file locks when Chrome is open (the history DB may be locked).  
• Open the DB in read-only mode to avoid concurrency issues.  
• Example query:
  ```sql
  SELECT url, title, last_visit_time
  FROM urls
  ORDER BY last_visit_time DESC
  LIMIT :limit;
  ```
• Convert Chrome's internal time format if needed (Chrome timestamps are often "WebKit epoch" microseconds since 1601).

### Next.js or Node Endpoint
• Expose an HTTP endpoint using Next.js route `/api/history` or an Express route in Node.  
• On request, detect the OS, assemble the correct DB path, open and query the SQLite file, then respond with JSON results.
• Implement error handling if the file is absent or locked.

### Testing & Validation
• Validate on macOS, Windows, Linux with various Chrome installations.  
• Check edge cases:  
  – Chrome not installed / file does not exist.  
  – Chrome open with potential file locks.  
  – Large or empty histories.

---

## Security and Privacy
• Access to local Chrome history carries privacy implications:  
  – Should only be run in trusted environments, not for general public hosting.  
  – Clearly communicate that the code reads local user data.  
  – Implement appropriate authentication or environment checks to block unauthorized usage.

---

## Implementation Steps
1. **Environment Detection**: Use `process.platform` to determine OS.  
2. **Path Assembly**:  
   – Windows => build path from `%LocalAppData%` and `path.join`.  
   – macOS => use `~/Library/...` prefix, expanding with `os.homedir()`.  
   – Linux => default to `~/.config/google-chrome/Default/History`.  
3. **SQLite Query**:  
   – Open the DB read-only.  
   – Run a SELECT for the recent entries (like top 10 or 100).  
   – Map results to JSON with fields like `url`, `title`, and `timestamp`.  
4. **Return JSON**:  
   – Send final data as JSON to the client or the calling service.  
5. **Error Handling**:  
   – If file not found, respond with error message.  
   – If DB is locked, instructions to close Chrome or handle concurrency.

---

## Composio Integration

To make the Chrome history and clustering functionality more accessible and reusable across the application, we've implemented a Composio-based tool approach:

### Custom History Tool Implementation

1. **Tool Creation**: We've created a custom Composio tool called `getChromeHistory` that wraps our direct SQLite history fetching functionality.

2. **Tool Definition**:
   ```typescript
   await toolset.createAction({
     actionName: "getChromeHistory",
     description: "Fetch browser history from Chrome",
     inputParams: z.object({
       maxItems: z.number().optional().describe("Maximum number of history items to fetch (default: 50)")
     }),
     callback: async (inputParams) => {
       const maxItems = inputParams.maxItems || 100;
       const historyItems = await fetchChromeHistory(maxItems);
       
       return {
         data: { items: historyItems },
         successful: true
       };
     }
   });
   ```

3. **Usage**: This tool replaces the previous `HISTORY_FETCHER_GET_WORKSPACE_HISTORY` action and can be used in any agent that needs to access Chrome history.

### Custom Cluster Tool Implementation

1. **Tool Creation**: We've also created a custom Composio tool called `clusterUrls` that wraps our URL clustering functionality.

2. **Tool Definition**:
   ```typescript
   await toolset.createAction({
     actionName: "clusterUrls",
     description: "Cluster URLs based on their content and generate insights",
     inputParams: z.object({
       baseUrl: z.string().describe("The base URL to crawl"),
       maxUrls: z.number().optional().describe("Maximum number of URLs to crawl (default: 20)"),
       preProcessedUrls: z.array(
         z.object({
           url: z.string(),
           title: z.string().optional()
         })
       ).optional().describe("Optional array of pre-processed URL data (bypasses firecrawl)")
     }),
     callback: async (inputParams) => {
       // Initialize OpenAI client and call the clusterUrls function
       const result = await clusterUrls(
         inputParams.baseUrl,
         inputParams.maxUrls || 20,
         openaiClient,
         inputParams.preProcessedUrls
       );
       
       return {
         data: { result },
         successful: true
       };
     }
   });
   ```

3. **Usage**: This tool can be used in any agent that needs to cluster URLs based on their content.

### Benefits of Composio Tools

1. **Standardized Interface**: Consistent interface for accessing browser data and functionality.
2. **Consistent Error Handling**: Unified error handling across different tools.
3. **Reusability**: Tools can be reused across different parts of the application.
4. **Configurability**: Tools accept parameters for customized behavior.
5. **Framework Compatibility**: Compatible with LangChain and other agent frameworks.
6. **Extensibility**: This pattern can be used to create additional tools for other browser data sources or operations.

---

## Acceptance Criteria
1. Able to retrieve and return at least N (configurable) of the most recent browser history entries across the major desktop platforms.  
2. Running the endpoint while Chrome is closed yields correct results.  
3. The project compiles in TypeScript without warnings or errors.  
4. Relevant error messages in case of missing or locked history file.

---

## Timeline
• Implementation: ~1-2 days  
• Testing across OS variations: ~1-2 days  
• Merging & Documentation: ~1 day

---

## Summary
This document specifies a straightforward, TypeScript-based solution for reading Chrome's local SQLite "History" database. By leveraging OS detection and a read-only SQLite driver, the API can fetch recent history data and present it in JSON without requiring Python or headless Chrome approaches. The implementation is further enhanced with Composio tools to provide a standardized interface for accessing browser history data across the application.
