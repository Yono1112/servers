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

const createRecordTool: Tool = {
  name: "bluesky_create_record",
  description: "Create a new record in the specified Bluesky repo and collection",
  inputSchema: {
    type: "object",
    properties: {
      repo: {
        type: "string",
        description:
          "The handle or DID of the repo (e.g., 'username.bsky.social'). If unsure whether to use the BSKY_HANDLE environment variable, please ask the user.",
      },
      collection: {
        type: "string",
        description: "The NSID of the record collection",
      },
      record: {
        type: "object",
        description: "The data for the new record",
      },
      rkey: {
        type: "string",
        description: "The Record Key (optional)",
      },
      validate: {
        type: "boolean",
        description: "Set to false to skip schema validation (default: true)",
      },
      swapCommit: {
        type: "string",
        description: "The CID of the previous commit (optional)",
      },
    },
    required: ["repo", "collection", "record"],
  },
};

async function createSession(PDSHost: string, userHandle: string, password: string): Promise<string> {
  if (!PDSHost || !userHandle || !password) {
    throw new Error("Missing required environment variables: PDS_HOST, BSKY_HANDLE, or BSKY_PASSWORD.");
  }

  const response = await fetch(`${PDSHost}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: userHandle,
      password: password,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to authenticate: ${data.error || response.statusText}`);
  }

  return data.accessJwt; // TODO: have to handle refreshJwt as well
}

// Bluesky Client
class BlueskyClient {
  private headers: { Authorization: string; "Content-Type": string };
  private PDSHost: string;

  constructor(accessJwt: string, PDSHost: string) {
    this.headers = {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": "application/json",
    };
    this.PDSHost = PDSHost;
  }

  async getUserProfile(handle: string): Promise<any> {
    const response = await fetch(
      `${this.PDSHost}/xrpc/app.bsky.actor.getProfile?actor=${handle}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async getUserPosts(handle: string, limit: number = 10): Promise<any> {
    const response = await fetch(
      `${this.PDSHost}/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${Math.min(
        limit,
        100
      )}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async createRecord(
    repo: string,
    collection: string,
    record: Record<string, any>,
    rkey?: string,
    validate: boolean = true,
    swapCommit?: string
  ): Promise<any> {
    const response = await fetch(
      `${this.PDSHost}/xrpc/com.atproto.repo.createRecord`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          repo,
          collection,
          record,
          rkey,
          validate,
          swapCommit,
        }),
      }
    );
  
    return response.json();
  }
}

// Main server
async function main() {
  const PDSHost = process.env.PDS_HOST || "https://bsky.social";
  const userHandle = process.env.BSKY_HANDLE;
  const password = process.env.BSKY_PASSWORD;

  if (!PDSHost || !userHandle || !password) {
    throw new Error("Missing required environment variables");
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
  
  try {
    const accessJwt = await createSession(PDSHost, userHandle, password);

    const blueskyClient = new BlueskyClient(accessJwt, PDSHost);

    server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
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

            case "bluesky_create_record": {
              const args = request.params.arguments as {
                repo: string;
                collection: string;
                record: Record<string, any>;
                rkey?: string;
                validate?: boolean;
                swapCommit?: string;
              };
              const response = await blueskyClient.createRecord(
                args.repo,
                args.collection,
                args.record,
                args.rkey,
                args.validate ?? true,
                args.swapCommit
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
      }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("Received ListToolsRequest");
      return {
        tools: [getUserProfileTool, getUserPostsTool, createRecordTool],
      };
    });

    const transport = new StdioServerTransport();
    console.error("Connecting server to transport...");
    await server.connect(transport);

    console.error("Bluesky API Server running on stdio");
  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
