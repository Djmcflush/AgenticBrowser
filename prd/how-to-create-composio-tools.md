# How to Create Composio Tools - Guide for Developers

## Overview

This document provides a comprehensive guide on creating custom Composio tools for use in agent-based systems. Composio tools provide a standardized way to expose functionality to AI agents, making it easier to build, maintain, and extend agent capabilities.

---

## What are Composio Tools?

Composio tools are a way to wrap existing functionality in a standardized interface that can be used by AI agents. They provide:

1. A consistent way to define tool parameters and return values
2. Type safety through Zod schema validation
3. Integration with agent frameworks like LangChain
4. Reusable components that can be shared across different parts of an application

---

## Prerequisites

To create Composio tools, you'll need:

1. **Dependencies**:
   ```bash
   npm install composio-core zod
   ```

2. **TypeScript Knowledge**: Understanding of TypeScript, especially type definitions and generics

3. **Existing Functionality**: The underlying functionality you want to expose as a tool

---

## Basic Structure of a Composio Tool

A Composio tool consists of:

1. **Tool Definition**: Metadata about the tool (name, description, parameters)
2. **Input Schema**: Definition of the parameters the tool accepts
3. **Callback Function**: The actual implementation that executes when the tool is called
4. **Return Value**: A standardized response format

---

## Step-by-Step Guide to Creating a Composio Tool

### 1. Import Required Dependencies

```typescript
import { OpenAIToolSet } from "composio-core";
import { z } from "zod";
```

### 2. Define Your Input Schema

Use Zod to define the schema for your tool's input parameters:

```typescript
const inputSchema = z.object({
  param1: z.string().describe("Description of parameter 1"),
  param2: z.number().optional().describe("Optional numeric parameter"),
  param3: z.array(z.string()).optional().describe("Optional array of strings")
});
```

### 3. Create a Function That Returns the Tool

```typescript
export async function createMyTool() {
  const toolset = new OpenAIToolSet();
  
  await toolset.createAction({
    actionName: "myToolName",
    description: "Description of what this tool does",
    inputParams: inputSchema,
    callback: async (inputParams, authCredentials, executeRequest) => {
      // Cast inputParams to the correct type
      const params = inputParams as z.infer<typeof inputSchema>;
      
      // Your implementation here
      const result = await yourExistingFunction(
        params.param1,
        params.param2,
        params.param3
      );
      
      // Return in the format expected by Composio
      return {
        data: { result },
        successful: true
      };
    }
  });
  
  // Return the tools
  return await toolset.getTools({
    actions: ["myToolName"]
  });
}
```

### 4. Handle Errors Properly

```typescript
callback: async (inputParams, authCredentials, executeRequest) => {
  try {
    const params = inputParams as z.infer<typeof inputSchema>;
    
    const result = await yourExistingFunction(
      params.param1,
      params.param2,
      params.param3
    );
    
    return {
      data: { result },
      successful: true
    };
  } catch (error) {
    console.error("Error in myToolName:", error);
    
    return {
      data: { error: error.message },
      successful: false
    };
  }
}
```

---

## Real-World Examples

### Example 1: Chrome History Tool

This tool wraps functionality to fetch Chrome browser history:

```typescript
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
    callback: async (inputParams, authCredentials, executeRequest) => {
      const params = inputParams as z.infer<typeof inputSchema>;
      const maxItems = params.maxItems || 100;
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
```

### Example 2: URL Clustering Tool

This tool wraps functionality to cluster URLs based on their content:

```typescript
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
    ).optional().describe("Optional array of pre-processed URL data (bypasses firecrawl)")
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
      const result = await clusterUrls(
        params.baseUrl,
        params.maxUrls || 20,
        openaiClient,
        processedUrls
      );
      
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
```

---

## Using Composio Tools in Agents

### With LangChain

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { pull } from "langchain/hub";
import { createMyTool } from "./my-tool";

async function executeAgent(input: string) {
  // Initialize the LLM
  const llm = new ChatOpenAI({
    model: "gpt-4-turbo",
    temperature: 0,
  });

  // Get the agent prompt from LangChain Hub
  const prompt = await pull("hwchase17/openai-functions-agent");

  // Get your custom tool
  const tools = await createMyTool();

  // Create the agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt
  });
  
  // Create the agent executor
  const agentExecutor = new AgentExecutor({ 
    agent, 
    tools, 
    verbose: true 
  });

  // Execute the agent
  const response = await agentExecutor.invoke({ input });
  
  return response;
}
```

### With Direct API Calls

```typescript
import { createMyTool } from "./my-tool";

async function useToolDirectly(param1: string, param2: number) {
  // Get your custom tool
  const tools = await createMyTool();
  
  // Use the first tool in the array (assuming there's only one)
  const result = await tools[0].function({
    param1,
    param2
  });
  
  return result.data;
}
```

---

## Best Practices

1. **Descriptive Names and Descriptions**: Use clear, descriptive names and descriptions for your tools and parameters.

2. **Proper Error Handling**: Always include error handling in your callback functions.

3. **Type Safety**: Use TypeScript and Zod to ensure type safety throughout your tool.

4. **Parameter Validation**: Validate parameters before using them in your implementation.

5. **Documentation**: Document your tools thoroughly, including examples of how to use them.

6. **Testing**: Write tests for your tools to ensure they work as expected.

7. **Versioning**: Consider versioning your tools if you expect them to change over time.

8. **Environment Variables**: Use environment variables for sensitive information like API keys.

9. **Logging**: Include appropriate logging to help with debugging.

10. **Performance**: Consider the performance implications of your tools, especially if they're used in high-traffic scenarios.

---

## Common Pitfalls and Solutions

### 1. Type Errors in Callback Function

**Problem**: TypeScript errors about parameter types in the callback function.

**Solution**: Use type casting with `as z.infer<typeof inputSchema>` to ensure TypeScript recognizes the correct types.

### 2. Returning Incorrect Data Format

**Problem**: The tool doesn't work because the return format is incorrect.

**Solution**: Always return an object with `data` and `successful` properties. The `data` property should be an object, not an array or primitive.

### 3. Not Handling Optional Parameters

**Problem**: The tool fails when optional parameters are not provided.

**Solution**: Always provide default values for optional parameters:

```typescript
const maxItems = params.maxItems || 100;
```

### 4. Not Handling Errors

**Problem**: Errors in the tool cause the entire agent to fail.

**Solution**: Wrap your implementation in a try/catch block and return a proper error response:

```typescript
try {
  // Implementation
} catch (error) {
  return {
    data: { error: error.message },
    successful: false
  };
}
```

---

## Extending and Customizing Tools

### Adding Authentication

```typescript
callback: async (inputParams, authCredentials, executeRequest) => {
  // Use authCredentials for authentication
  if (!authCredentials || !authCredentials.apiKey) {
    return {
      data: { error: "API key is required" },
      successful: false
    };
  }
  
  // Rest of implementation
}
```

### Chaining Tools

You can chain tools together by calling one tool from another:

```typescript
callback: async (inputParams, authCredentials, executeRequest) => {
  // Call another tool
  const otherToolResult = await executeRequest({
    actionName: "otherTool",
    params: {
      // Parameters for the other tool
    }
  });
  
  // Use the result from the other tool
  const result = await yourExistingFunction(otherToolResult.data);
  
  return {
    data: { result },
    successful: true
  };
}
```

---

## Summary

Creating Composio tools provides a standardized way to expose functionality to AI agents. By following the guidelines in this document, you can create tools that are:

1. **Standardized**: Consistent interface for all tools
2. **Type-Safe**: Validated parameters and return values
3. **Reusable**: Can be used across different parts of an application
4. **Extensible**: Easy to extend and customize
5. **Compatible**: Works with various agent frameworks

This approach makes it easier to build, maintain, and extend agent capabilities, resulting in more robust and flexible AI systems.
