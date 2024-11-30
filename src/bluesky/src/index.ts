#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import fetch from "node-fetch";

// Tool definitions
const getUserProfileTool: Tool = {
  name: "bluesky_get_user_profile",
  description: "Get detailed profile information for a specific Bluesky user",
  inputSchema: {
    type: "object",
    properties: {
      handle: {
        type: "string",
        description: "The handle of the user (e.g., 'username.bsky.social')",
      },
    },
    required: ["handle"],
  },
};

const getUserPostsTool: Tool = {
  name: "bluesky_get_user_posts",
  description: "Get recent posts from a specific Bluesky user",
  inputSchema: {
    type: "object",
    properties: {
      handle: {
        type: "string",
        description: "The handle of the user (e.g., 'username.bsky.social')",
      },
      limit: {
        type: "number",
        description: "Number of posts to retrieve (default 10, max 100)",
        default: 10,
      },
    },
    required: ["handle"],
  },
};

// Bluesky Client
class BlueskyClient {
  private headers: { Authorization: string; "Content-Type": string };

  constructor(accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async getUserProfile(handle: string): Promise<any> {
    const response = await fetch(
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${handle}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async getUserPosts(handle: string, limit: number = 10): Promise<any> {
    const response = await fetch(
      `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${Math.min(
        limit,
        100
      )}`,
      { headers: this.headers }
    );
    return response.json();
  }
}

// Main server
async function main() {
  const accessToken = process.env.BLUESKY_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Please set the BLUESKY_ACCESS_TOKEN environment variable.");
    process.exit(1);
  }

  const server = new Server(
    {
      name: "Bluesky API Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const blueskyClient = new BlueskyClient(accessToken);

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error("Received CallToolRequest:", request);

    try {
      if (!request.params.arguments) {
        throw new Error("No arguments provided");
      }

      switch (request.params.name) {
        case "bluesky_get_user_profile": {
          const args = request.params.arguments as { handle: string };
          const response = await blueskyClient.getUserProfile(args.handle);
          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          };
        }

        case "bluesky_get_user_posts": {
          const args = request.params.arguments as { handle: string; limit?: number };
          const response = await blueskyClient.getUserPosts(
            args.handle,
            args.limit || 10
          );
          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      console.error("Error executing tool:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [getUserProfileTool, getUserPostsTool],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Bluesky API Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
