--------------------------------------------------------------------------------
PRODUCT REQUIREMENTS DOCUMENT (PRD)
--------------------------------------------------------------------------------

1. OVERVIEW  
We need to implement a Firecrawl-based scraping tooling located in “src/api/tools.” This tool will be responsible for retrieving website content, following the Firecrawl docs at https://docs.firecrawl.dev/introduction. Rather than relying on any older references to browserbase.com, this new tool will use the Firecrawl endpoints (e.g. https://api.firecrawl.dev/v1/scrape) as described in the official documentation.

2. OBJECTIVES  
• Centralize site-scraping functionality in a single location (“firecrawlTool.ts”) so that any logic for extracting website data (title, content, metadata) is consistent and reusable.  
• Align with existing Composio/OpenAIToolSet patterns (e.g. “createChromeHistoryTool” and “createClusterTool”).  
• Ensure references to Firecrawl’s “/scrape” and “/extract” endpoints match the official API at https://firecrawl.dev.  
• Provide support for single-page scraping, crawling multiple pages, advanced actions (click, wait, write, press, screenshot), and LLM-based extraction.

3. SCOPE  
• Create (or refactor) a file “firecrawlTool.ts” under “src/api/tools/.”  
• Adapt the older code from “cluster_tool.ts” to reference the correct Firecrawl endpoints (e.g. “/scrape,” “/crawl,” “/extract”).  
• Use environment variables (e.g. “process.env.FIRECRAWL_API_KEY”) for authentication.  
• Provide the same shape for returning data: array of objects with url, title, content, and metadata fields.

4. USE CASES  
• As a developer, I can call “firecrawlTool.firecrawlWebsite(baseUrl, maxUrls)” to crawl content from up to “maxUrls” pages starting at “baseUrl,” making requests to “https://api.firecrawl.dev/v1/crawl.”  
• For single-page scraping or extraction, I can call “firecrawlTool.scrapePage(...).” This will use “https://api.firecrawl.dev/v1/scrape” or “/extract” with optional action steps (click, wait, screenshot, etc.)  
• The code integrates seamlessly with cluster-based tools (like “createClusterTool”) or future expansions for LLM data extraction.

5. TECHNICAL REQUIREMENTS  

• For single-page scraping, we’ll invoke “POST https://api.firecrawl.dev/v1/scrape” with arguments such as:  
  - “url,” “formats,” “actions,” “includeTags,” “excludeTags,” etc.  
  - Example cURL snippet from docs:  
    ```bash
    curl -X POST https://api.firecrawl.dev/v1/scrape \
      -H 'Content-Type: application/json' \
      -H 'Authorization: Bearer YOUR_API_KEY' \
      -d '{
          "url": "google.com",
          "formats": ["markdown"],
          "actions": [
              {"type": "wait", "milliseconds": 2000},
              {"type": "click", "selector": "textarea[title=\"Search\"]"},
              {"type": "wait", "milliseconds": 2000},
              {"type": "write", "text": "firecrawl"},
              {"type": "wait", "milliseconds": 2000},
              {"type": "press", "key": "ENTER"},
              {"type": "wait", "milliseconds": 3000},
              {"type": "click", "selector": "h3"},
              {"type": "wait", "milliseconds": 3000},
              {"type": "screenshot"}
          ]
      }'
    ```
• For crawling entire websites, we’ll invoke “POST https://api.firecrawl.dev/v1/crawl,” returning a job ID that can be polled or retrieved using “check_crawl_status.”  
• For LLM-based extraction, we’ll use “POST https://api.firecrawl.dev/v1/extract” or “/extract” with JSON schema or prompt-based extraction.  
• The system must handle pagination if the response data exceeds 10MB chunks.

6. DELIVERABLES  
• “firecrawlTool.ts” with functions for:  
  1. singlePageScrape() – wrapper around “POST /scrape”  
  2. crawlWebsite() – wrapper around “POST /crawl”  
  3. checkCrawlStatus() – GET or POST to “/crawl/:id”  
  4. extract() – wrapper for LLM-based extraction (with or without schema).  
• Updated references in other code modules (like “cluster_tool.ts”) to remove references to “browserbase.com” or older endpoints.

--------------------------------------------------------------------------------
7. FIRECRAWL TOOLS
--------------------------------------------------------------------------------

Below are the additional Firecrawl tools that should be included in the system. They provide flexible options for single-URL scraping, batch scraping, status checking, and AI-assisted data extraction.

7.1 SCRAPE TOOL (firecrawl_scrape)  
Scrapes content from a single URL with advanced options.  
• Key arguments include URL, formats array (e.g. ["markdown"]), onlyMainContent, waitFor, timeout, etc.  
• Actions can be provided to navigate or interact with dynamic pages.

Example request arguments:

{
  "name": "firecrawl_scrape",
  "arguments": {
    "url": "google.com",
    "formats": ["markdown"],
    "actions": [
      {"type": "wait", "milliseconds": 2000},
      {"type": "click", "selector": "textarea[title=\"Search\"]"},
      ...
    ]
  }
}

7.2 BATCH SCRAPE TOOL (firecrawl_batch_scrape)  
Scrapes multiple URLs with built-in rate limiting and parallel processing.  
• Accepts a list of URLs and configuration in “options.”  
• Returns an operation ID for progress checks.

Example request arguments:

{
  "name": "firecrawl_batch_scrape",
  "arguments": {
    "urls": ["https://example1.com", "https://example2.com"],
    "options": {
      "formats": ["markdown"],
      "onlyMainContent": true
    }
  }
}

7.3 CHECK BATCH STATUS (firecrawl_check_batch_status)  
Checks status of a previously queued batch operation.

Example request arguments:

{
  "name": "firecrawl_check_batch_status",
  "arguments": {
    "id": "batch_1"
  }
}

7.4 EXTRACT TOOL (firecrawl_extract)  
Extracts structured information from one or multiple URLs.  
• Accepts optional JSON schema or “prompt” for flexible data extraction.  
• Uses LLM-based techniques to parse content from the pages into a structured response.

Example request arguments:

{
  "name": "firecrawl_extract",
  "arguments": {
    "urls": ["https://example.com/page1", "https://example.com/page2"],
    "prompt": "Extract product information including name, price, and description"
  }
}


--------------------------------------------------------------------------------
8. ADDITIONAL INSIGHTS FROM FIRECRAWL DOCS
--------------------------------------------------------------------------------

We performed a sample scrape of the Firecrawl docs (https://docs.firecrawl.dev/introduction) and confirmed:
• “/scrape” and “/crawl” endpoints automatically handle dynamic content, chunked responses, LLM-based extraction.  
• “actions” enable a pre-scrape workflow (click, wait, scroll, etc.).  
• Larger data sets may require polling or repeated GET calls if the size limit (10MB) is exceeded.  
• Self-hosting is under AGPL-3.0, or a user can leverage the hosted service at https://firecrawl.dev.  

This updated approach ensures all references in our project match official Firecrawl endpoints (https://api.firecrawl.dev/) rather than older or unrecognized APIs.

--------------------------------------------------------------------------------
(END OF DOCUMENT)
