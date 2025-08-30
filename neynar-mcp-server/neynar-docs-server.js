// neynar-docs-server.js
// A custom MCP server for serving Neynar documentation to your IDE

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NeynarDocsServer {
  constructor() {
    this.server = new Server(
      {
        name: "neynar-docs-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Cache for documentation content
    this.docsCache = {
      llmText: null,
      llmTextFull: null,
      openAPI: null,
      searchIndex: new Map(), // For quick searching
    };

    this.setupHandlers();
  }

  async loadDocumentation() {
    try {
      // Load all documentation files
      // Adjust these paths to match your file locations
      const docsPath = path.join(__dirname, "docs");

      console.error("Loading documentation files...");

      // Load the main documentation files
      this.docsCache.llmText = await fs.readFile(
        path.join(docsPath, "neynar-llm.txt"),
        "utf-8"
      );

      this.docsCache.llmTextFull = await fs.readFile(
        path.join(docsPath, "neynar-llm-full.txt"),
        "utf-8"
      );

      this.docsCache.openAPI = await fs.readFile(
        path.join(docsPath, "openAPI.yaml"),
        "utf-8"
      );

      // Build search index for efficient querying
      this.buildSearchIndex();

      console.error("Documentation loaded successfully");
    } catch (error) {
      console.error("Error loading documentation:", error);
    }
  }

  buildSearchIndex() {
    // Create an index of sections for quick searching
    // This parses the documentation into searchable chunks

    const processDoc = (text, source) => {
      // Split by common section markers (adjust based on your doc format)
      const sections = text.split(/(?=^#{1,3}\s)/gm);

      sections.forEach((section) => {
        // Extract section title and content
        const lines = section.split("\n");
        const title = lines[0]?.replace(/^#+\s*/, "") || "Untitled";

        // Create searchable keywords from title and first few lines
        const keywords = this.extractKeywords(section.substring(0, 500));

        // Store in search index
        keywords.forEach((keyword) => {
          if (!this.searchIndex.has(keyword)) {
            this.searchIndex.set(keyword, []);
          }
          this.searchIndex.get(keyword).push({
            source,
            title,
            content: section,
            relevance: 1,
          });
        });
      });
    };

    // Process each documentation file
    if (this.docsCache.llmText) {
      processDoc(this.docsCache.llmText, "neynar-llm");
    }
    if (this.docsCache.llmTextFull) {
      processDoc(this.docsCache.llmTextFull, "neynar-llm-full");
    }
  }

  extractKeywords(text) {
    // Extract meaningful keywords for indexing
    // This is a simple implementation - you can make it more sophisticated

    const stopWords = new Set([
      "the",
      "is",
      "at",
      "which",
      "on",
      "and",
      "a",
      "an",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // unique only
  }

  searchDocumentation(query, maxResults = 5) {
    // Smart search across documentation
    const queryKeywords = this.extractKeywords(query.toLowerCase());
    const results = new Map();

    // Score each section based on keyword matches
    queryKeywords.forEach((keyword) => {
      const sections = this.searchIndex.get(keyword) || [];

      sections.forEach((section) => {
        const key = `${section.source}:${section.title}`;
        if (!results.has(key)) {
          results.set(key, {
            ...section,
            score: 0,
          });
        }
        results.get(key).score += section.relevance;
      });
    });

    // Sort by relevance and return top results
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  setupHandlers() {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_neynar_docs",
          description:
            "Search Neynar API documentation for specific topics, endpoints, or features",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  'Search query (e.g., "cast reactions", "user profile", "webhooks")',
              },
              max_results: {
                type: "number",
                description: "Maximum number of results to return (default: 5)",
                default: 5,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_api_spec",
          description:
            "Get OpenAPI specification for a specific endpoint or operation",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: {
                type: "string",
                description: "API endpoint path or operation name",
              },
            },
            required: ["endpoint"],
          },
        },
        {
          name: "list_endpoints",
          description:
            "List all available Neynar API endpoints grouped by category",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Filter by category (optional)",
              },
            },
          },
        },
      ],
    }));

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "search_neynar_docs": {
          const results = this.searchDocumentation(
            args.query,
            args.max_results || 5
          );

          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No documentation found for: "${args.query}". Try different keywords or browse endpoints with 'list_endpoints'.`,
                },
              ],
            };
          }

          // Format results for readability
          const formattedResults = results
            .map(
              (result, index) =>
                `### ${index + 1}. ${result.title}\n` +
                `Source: ${result.source}\n` +
                `Relevance: ${result.score}\n\n` +
                `${result.content.substring(0, 1000)}...\n`
            )
            .join("\n---\n\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${results.length} relevant sections:\n\n${formattedResults}`,
              },
            ],
          };
        }

        case "get_api_spec": {
          // Extract specific endpoint details from OpenAPI spec
          const endpoint = args.endpoint.toLowerCase();
          const specLines = this.docsCache.openAPI.split("\n");

          let capturing = false;
          let captured = [];
          let depth = 0;

          for (const line of specLines) {
            if (line.includes(endpoint) && line.includes("paths:")) {
              capturing = true;
              depth = line.match(/^\s*/)[0].length;
            }

            if (capturing) {
              captured.push(line);

              // Stop when we reach the next endpoint at the same depth
              if (
                line.match(/^\s*/)[0].length <= depth &&
                captured.length > 1
              ) {
                break;
              }
            }
          }

          return {
            content: [
              {
                type: "text",
                text:
                  captured.length > 0
                    ? `API Specification for ${endpoint}:\n\n\`\`\`yaml\n${captured.join(
                        "\n"
                      )}\n\`\`\``
                    : `No specification found for endpoint: ${endpoint}`,
              },
            ],
          };
        }

        case "list_endpoints": {
          // Parse and list available endpoints from OpenAPI
          const endpoints = this.extractEndpoints(this.docsCache.openAPI);

          const filtered = args.category
            ? endpoints.filter((e) => e.category === args.category)
            : endpoints;

          const grouped = filtered.reduce((acc, endpoint) => {
            if (!acc[endpoint.category]) {
              acc[endpoint.category] = [];
            }
            acc[endpoint.category].push(`${endpoint.method} ${endpoint.path}`);
            return acc;
          }, {});

          const formatted = Object.entries(grouped)
            .map(
              ([category, paths]) =>
                `## ${category}\n${paths.map((p) => `- ${p}`).join("\n")}`
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: `Available Neynar API Endpoints:\n\n${formatted}`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  extractEndpoints(openAPISpec) {
    // Parse endpoints from OpenAPI spec
    // This is a simplified parser - enhance based on your spec structure
    const endpoints = [];
    const lines = openAPISpec.split("\n");

    let currentPath = null;
    let currentCategory = "General";

    for (const line of lines) {
      // Detect path definitions
      if (line.match(/^\s{2}\/[\w\/-{}]+:/)) {
        currentPath = line.trim().replace(":", "");
      }

      // Detect HTTP methods
      if (currentPath && line.match(/^\s{4}(get|post|put|delete|patch):/)) {
        const method = line.trim().replace(":", "").toUpperCase();

        // Try to extract category from tags or path
        if (currentPath.includes("/user")) currentCategory = "Users";
        else if (currentPath.includes("/cast")) currentCategory = "Casts";
        else if (currentPath.includes("/channel")) currentCategory = "Channels";
        else if (currentPath.includes("/reaction"))
          currentCategory = "Reactions";
        else if (currentPath.includes("/webhook")) currentCategory = "Webhooks";

        endpoints.push({
          path: currentPath,
          method,
          category: currentCategory,
        });
      }
    }

    return endpoints;
  }

  async run() {
    // Load documentation before starting
    await this.loadDocumentation();

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Neynar Docs MCP Server running");
  }
}

// Initialize and run the server
const server = new NeynarDocsServer();
server.run().catch(console.error);
