import { OpenAI } from "openai";
import axios from "axios";
import { OpenAIToolSet } from "composio-core";
import { z } from "zod";

// Interface for URL data
interface UrlData {
  url: string;
  title: string;
  content: string;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

// Interface for scrape options
interface ScrapeOptions {
  formats?: string[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
  timeout?: number;
  actions?: ScrapeAction[];
  extract?: ExtractOptions;
  mobile?: boolean;
  skipTlsVerification?: boolean;
  removeBase64Images?: boolean;
  location?: {
    country?: string;
    languages?: string[];
  };
}

// Interface for scrape actions
interface ScrapeAction {
  type: "wait" | "click" | "screenshot" | "write" | "press" | "scroll" | "scrape" | "executeJavascript";
  selector?: string;
  milliseconds?: number;
  text?: string;
  key?: string;
  direction?: "up" | "down";
  script?: string;
  fullPage?: boolean;
}

// Interface for extract options
interface ExtractOptions {
  schema?: any;
  systemPrompt?: string;
  prompt?: string;
}

/**
 * Scrape a single webpage using Firecrawl API
 * @param url The URL to scrape
 * @param options Scraping options including formats, actions, etc.
 * @returns Promise with the scraped data
 */
export async function singlePageScrape(
  url: string,
  options: ScrapeOptions = {}
): Promise<any> {
  try {
    console.log(`Starting scrape of ${url}`);
    
    // Use Firecrawl API to scrape the webpage
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      {
        url,
        formats: options.formats || ["markdown"],
        onlyMainContent: options.onlyMainContent,
        includeTags: options.includeTags,
        excludeTags: options.excludeTags,
        waitFor: options.waitFor,
        timeout: options.timeout,
        actions: options.actions,
        extract: options.extract,
        mobile: options.mobile,
        skipTlsVerification: options.skipTlsVerification,
        removeBase64Images: options.removeBase64Images,
        location: options.location
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data) {
      throw new Error("Invalid response from Firecrawl API");
    }

    console.log(`Scrape completed for ${url}`);
    return response.data;
  } catch (error) {
    console.error("Error during page scrape:", error);
    throw error;
  }
}

/**
 * Crawl a website starting from a base URL
 * @param baseUrl The base URL to start crawling from
 * @param maxUrls Maximum number of URLs to crawl (default: 20)
 * @param options Additional crawl options
 * @returns Promise with the job ID for status checking
 */
export async function crawlWebsite(
  baseUrl: string,
  maxUrls: number = 20,
  options: {
    excludePaths?: string[];
    includePaths?: string[];
    maxDepth?: number;
    ignoreSitemap?: boolean;
    allowBackwardLinks?: boolean;
    allowExternalLinks?: boolean;
    deduplicateSimilarURLs?: boolean;
    ignoreQueryParameters?: boolean;
    scrapeOptions?: ScrapeOptions;
  } = {}
): Promise<string> {
  try {
    console.log(`Starting crawl of ${baseUrl}`);
    
    // Use Firecrawl API to crawl the website
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/crawl",
      {
        url: baseUrl,
        limit: maxUrls,
        excludePaths: options.excludePaths,
        includePaths: options.includePaths,
        maxDepth: options.maxDepth,
        ignoreSitemap: options.ignoreSitemap,
        allowBackwardLinks: options.allowBackwardLinks,
        allowExternalLinks: options.allowExternalLinks,
        deduplicateSimilarURLs: options.deduplicateSimilarURLs,
        ignoreQueryParameters: options.ignoreQueryParameters,
        scrapeOptions: options.scrapeOptions
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data || !response.data.id) {
      throw new Error("Invalid response from Firecrawl API");
    }

    console.log(`Crawl job submitted with ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error("Error during website crawl:", error);
    throw error;
  }
}

/**
 * Check the status of a crawl job
 * @param jobId The ID of the crawl job to check
 * @returns Promise with the job status and results if available
 */
export async function checkCrawlStatus(jobId: string): Promise<any> {
  try {
    console.log(`Checking status of crawl job ${jobId}`);
    
    // Use Firecrawl API to check job status
    const response = await axios.get(
      `https://api.firecrawl.dev/v1/crawl/${jobId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data) {
      throw new Error("Invalid response from Firecrawl API");
    }

    // Transform the response data into a consistent format if completed
    if (response.data.status === 'completed' && response.data.results) {
      const urlDataArray: UrlData[] = response.data.results.map((result: any) => ({
        url: result.url,
        title: result.title || "",
        content: result.content || "",
        metadata: {
          description: result.description || "",
          ...result.metadata
        }
      }));
      
      return {
        status: response.data.status,
        results: urlDataArray,
        totalPages: response.data.totalPages,
        completedAt: response.data.completedAt
      };
    }

    // Return raw response for jobs still in progress
    return response.data;
  } catch (error) {
    console.error(`Error checking crawl status for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Batch scrape multiple URLs with optional rate limiting
 * @param urls Array of URLs to scrape
 * @param options Scraping options
 * @returns Promise with the job ID for status checking
 */
export async function batchScrape(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<string> {
  try {
    console.log(`Starting batch scrape of ${urls.length} URLs`);
    
    // Use Firecrawl API to batch scrape URLs
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/batch/scrape",
      {
        urls,
        options: {
          formats: options.formats || ["markdown"],
          onlyMainContent: options.onlyMainContent,
          includeTags: options.includeTags,
          excludeTags: options.excludeTags,
          waitFor: options.waitFor,
          timeout: options.timeout,
          actions: options.actions,
          mobile: options.mobile,
          skipTlsVerification: options.skipTlsVerification,
          removeBase64Images: options.removeBase64Images
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data || !response.data.id) {
      throw new Error("Invalid response from Firecrawl API");
    }

    console.log(`Batch scrape job submitted with ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error("Error during batch scrape:", error);
    throw error;
  }
}

/**
 * Check the status of a batch scrape job
 * @param jobId The ID of the batch scrape job to check
 * @returns Promise with the job status and results if available
 */
export async function checkBatchStatus(jobId: string): Promise<any> {
  try {
    console.log(`Checking status of batch scrape job ${jobId}`);
    
    // Use Firecrawl API to check job status
    const response = await axios.get(
      `https://api.firecrawl.dev/v1/batch_scrape/${jobId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data) {
      throw new Error("Invalid response from Firecrawl API");
    }

    return response.data;
  } catch (error) {
    console.error(`Error checking batch status for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Extract structured information from webpages using LLM
 * @param urls Array of URLs to extract information from
 * @param options Extract options including schema, prompt, etc.
 * @returns Promise with the extracted data
 */
export async function extract(
  urls: string[],
  options: {
    prompt?: string;
    systemPrompt?: string;
    schema?: any;
    allowExternalLinks?: boolean;
    enableWebSearch?: boolean;
    includeSubdomains?: boolean;
  } = {}
): Promise<any> {
  try {
    console.log(`Starting extraction for ${urls.length} URLs`);
    
    // Use Firecrawl API to extract information
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/extract",
      {
        urls,
        prompt: options.prompt,
        systemPrompt: options.systemPrompt,
        schema: options.schema,
        allowExternalLinks: options.allowExternalLinks,
        enableWebSearch: options.enableWebSearch,
        includeSubdomains: options.includeSubdomains
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data) {
      throw new Error("Invalid response from Firecrawl API");
    }

    console.log(`Extraction completed for ${urls.length} URLs`);
    return response.data;
  } catch (error) {
    console.error("Error during extraction:", error);
    throw error;
  }
}

/**
 * Perform deep research on a query using web crawling, search, and AI analysis
 * @param query The query to research
 * @param options Research options including depth, time limit, etc.
 * @returns Promise with the research results
 */
export async function deepResearch(
  query: string,
  options: {
    maxDepth?: number;
    timeLimit?: number;
    maxUrls?: number;
  } = {}
): Promise<any> {
  try {
    console.log(`Starting deep research for query: ${query}`);
    
    // Use Firecrawl API to perform deep research
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/deep_research",
      {
        query,
        maxDepth: options.maxDepth,
        timeLimit: options.timeLimit,
        maxUrls: options.maxUrls
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data) {
      throw new Error("Invalid response from Firecrawl API");
    }

    console.log(`Deep research completed for query: ${query}`);
    return response.data;
  } catch (error) {
    console.error("Error during deep research:", error);
    throw error;
  }
}

/**
 * Transform raw Firecrawl website data into a consistent format
 * @param firecrawlData Raw data from Firecrawl API
 * @returns Transformed UrlData array
 */
export function transformFirecrawlData(firecrawlData: any): UrlData[] {
  if (!firecrawlData || !firecrawlData.results) {
    return [];
  }
  
  return firecrawlData.results.map((result: any) => ({
    url: result.url,
    title: result.title || "",
    content: result.content || result.markdown || "",
    metadata: {
      description: result.description || "",
      ...result.metadata
    }
  }));
}

/**
 * Creates a Composio tool for Firecrawl single-page scraping
 * @returns Promise with the configured tool
 */
export async function createFirecrawlScrapeTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    url: z.string().describe("The URL to scrape"),
    formats: z.array(z.string()).optional().describe("Content formats to extract (default: ['markdown'])"),
    onlyMainContent: z.boolean().optional().describe("Extract only the main content, filtering out navigation, footers, etc."),
    includeTags: z.array(z.string()).optional().describe("HTML tags to specifically include in extraction"),
    excludeTags: z.array(z.string()).optional().describe("HTML tags to exclude from extraction"),
    waitFor: z.number().optional().describe("Time in milliseconds to wait for dynamic content to load"),
    timeout: z.number().optional().describe("Maximum time in milliseconds to wait for the page to load"),
    actions: z.array(
      z.object({
        type: z.enum(["wait", "click", "screenshot", "write", "press", "scroll", "scrape", "executeJavascript"]),
        selector: z.string().optional(),
        milliseconds: z.number().optional(),
        text: z.string().optional(),
        key: z.string().optional(),
        direction: z.enum(["up", "down"]).optional(),
        script: z.string().optional(),
        fullPage: z.boolean().optional()
      })
    ).optional().describe("List of actions to perform before scraping"),
    mobile: z.boolean().optional().describe("Use mobile viewport")
  });
  
  // Create a custom tool for Firecrawl scraping
  await toolset.createAction({
    actionName: "firecrawl_scrape",
    description: "Scrape a single webpage with advanced options for content extraction",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const result = await singlePageScrape(params.url, {
          formats: params.formats,
          onlyMainContent: params.onlyMainContent,
          includeTags: params.includeTags,
          excludeTags: params.excludeTags,
          waitFor: params.waitFor,
          timeout: params.timeout,
          actions: params.actions,
          mobile: params.mobile
        });
        
        // Return in the format expected by Composio
        return {
          data: { result },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_scrape"]
  });
}

/**
 * Creates a Composio tool for Firecrawl website crawling
 * @returns Promise with the configured tool
 */
export async function createFirecrawlCrawlTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    baseUrl: z.string().describe("The base URL to crawl"),
    maxUrls: z.number().optional().describe("Maximum number of URLs to crawl (default: 20)"),
    excludePaths: z.array(z.string()).optional().describe("URL paths to exclude from crawling"),
    includePaths: z.array(z.string()).optional().describe("Only crawl these URL paths"),
    maxDepth: z.number().optional().describe("Maximum link depth to crawl"),
    ignoreSitemap: z.boolean().optional().describe("Skip sitemap.xml discovery"),
    allowBackwardLinks: z.boolean().optional().describe("Allow crawling links that point to parent directories"),
    allowExternalLinks: z.boolean().optional().describe("Allow crawling links to external domains")
  });
  
  // Create a custom tool for Firecrawl crawling
  await toolset.createAction({
    actionName: "firecrawl_crawl",
    description: "Crawl a website starting from a base URL",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const jobId = await crawlWebsite(params.baseUrl, params.maxUrls, {
          excludePaths: params.excludePaths,
          includePaths: params.includePaths,
          maxDepth: params.maxDepth,
          ignoreSitemap: params.ignoreSitemap,
          allowBackwardLinks: params.allowBackwardLinks,
          allowExternalLinks: params.allowExternalLinks
        });
        
        // Return in the format expected by Composio
        return {
          data: { 
            jobId,
            message: "Crawl job started successfully. Use firecrawl_check_crawl_status with this jobId to check results." 
          },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_crawl"]
  });
}

/**
 * Creates a Composio tool for checking Firecrawl crawl status
 * @returns Promise with the configured tool
 */
export async function createFirecrawlCheckCrawlStatusTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    id: z.string().describe("Crawl job ID to check")
  });
  
  // Create a custom tool for checking Firecrawl crawl status
  await toolset.createAction({
    actionName: "firecrawl_check_crawl_status",
    description: "Check the status of a crawl job",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const result = await checkCrawlStatus(params.id);
        
        // Return in the format expected by Composio
        return {
          data: { result },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_check_crawl_status"]
  });
}

/**
 * Creates a Composio tool for Firecrawl batch scraping
 * @returns Promise with the configured tool
 */
export async function createFirecrawlBatchScrapeTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    urls: z.array(z.string()).describe("List of URLs to scrape"),
    options: z.object({
      formats: z.array(z.string()).optional().describe("Content formats to extract (default: ['markdown'])"),
      onlyMainContent: z.boolean().optional().describe("Extract only the main content from pages")
    }).optional().describe("Scraping options")
  });
  
  // Create a custom tool for Firecrawl batch scraping
  await toolset.createAction({
    actionName: "firecrawl_batch_scrape",
    description: "Scrape multiple URLs in batch mode",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const jobId = await batchScrape(params.urls, params.options || {});
        
        // Return in the format expected by Composio
        return {
          data: { 
            jobId,
            message: "Batch scrape job started successfully. Use firecrawl_check_batch_status with this jobId to check results." 
          },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_batch_scrape"]
  });
}

/**
 * Creates a Composio tool for checking Firecrawl batch status
 * @returns Promise with the configured tool
 */
export async function createFirecrawlCheckBatchStatusTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    id: z.string().describe("Batch job ID to check")
  });
  
  // Create a custom tool for checking Firecrawl batch status
  await toolset.createAction({
    actionName: "firecrawl_check_batch_status",
    description: "Check the status of a batch scraping job",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const result = await checkBatchStatus(params.id);
        
        // Return in the format expected by Composio
        return {
          data: { result },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_check_batch_status"]
  });
}

/**
 * Creates a Composio tool for Firecrawl extraction
 * @returns Promise with the configured tool
 */
export async function createFirecrawlExtractTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    urls: z.array(z.string()).describe("List of URLs to extract information from"),
    prompt: z.string().optional().describe("Prompt for the LLM extraction"),
    systemPrompt: z.string().optional().describe("System prompt for LLM extraction"),
    schema: z.any().optional().describe("JSON schema for structured data extraction"),
    allowExternalLinks: z.boolean().optional().describe("Allow extraction from external links"),
    enableWebSearch: z.boolean().optional().describe("Enable web search for additional context")
  });
  
  // Create a custom tool for Firecrawl extraction
  await toolset.createAction({
    actionName: "firecrawl_extract",
    description: "Extract structured information from web pages using LLM",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const result = await extract(params.urls, {
          prompt: params.prompt,
          systemPrompt: params.systemPrompt,
          schema: params.schema,
          allowExternalLinks: params.allowExternalLinks,
          enableWebSearch: params.enableWebSearch
        });
        
        // Return in the format expected by Composio
        return {
          data: { result },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_extract"]
  });
}

/**
 * Creates a Composio tool for Firecrawl deep research
 * @returns Promise with the configured tool
 */
export async function createFirecrawlDeepResearchTool() {
  const toolset = new OpenAIToolSet();
  
  // Define the input parameters schema
  const inputSchema = z.object({
    query: z.string().describe("The query to research"),
    maxDepth: z.number().optional().describe("Maximum depth of research iterations (1-10)"),
    timeLimit: z.number().optional().describe("Time limit in seconds (30-300)"),
    maxUrls: z.number().optional().describe("Maximum number of URLs to analyze (1-1000)")
  });
  
  // Create a custom tool for Firecrawl deep research
  await toolset.createAction({
    actionName: "firecrawl_deep_research",
    description: "Conduct deep research on a query using web crawling, search, and AI analysis",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      
      try {
        const result = await deepResearch(params.query, {
          maxDepth: params.maxDepth,
          timeLimit: params.timeLimit,
          maxUrls: params.maxUrls
        });
        
        // Return in the format expected by Composio
        return {
          data: { result },
          successful: true
        };
      } catch (error: any) {
        return {
          data: { error: error.message },
          successful: false
        };
      }
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["firecrawl_deep_research"]
  });
}

/**
 * Creates all Firecrawl Composio tools
 * @returns Promise with all configured tools
 */
export async function createFirecrawlTools() {
  const toolset = new OpenAIToolSet();
  
  // Add all the Firecrawl tools
  const scrapeTool = await createFirecrawlScrapeTool();
  const crawlTool = await createFirecrawlCrawlTool();
  const checkCrawlStatusTool = await createFirecrawlCheckCrawlStatusTool();
  const batchScrapeTool = await createFirecrawlBatchScrapeTool();
  const checkBatchStatusTool = await createFirecrawlCheckBatchStatusTool();
  const extractTool = await createFirecrawlExtractTool();
  const deepResearchTool = await createFirecrawlDeepResearchTool();
  
  // Combine all tools
  return [
    ...scrapeTool,
    ...crawlTool,
    ...checkCrawlStatusTool,
    ...batchScrapeTool,
    ...checkBatchStatusTool,
    ...extractTool,
    ...deepResearchTool
  ];
}
