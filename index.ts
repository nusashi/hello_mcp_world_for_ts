#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";

// ツール定義 - Hello Worldを返すだけのシンプルなツール
const HELLO_WORLD_TOOL: Tool = {
    name: "hello_world",
    description: "Returns a friendly 'Hello MCP World' message.",
    inputSchema: {
        type: "object",
        properties: {}, // パラメータなし
    },
};

// サーバーインスタンスを作成
const server = new Server(
    {
        name: "minimal-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {}, // ツール機能のみ有効化
        },
    }
);

// ツール一覧を返すハンドラ
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [HELLO_WORLD_TOOL],
}));

// ツール呼び出しハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name } = request.params;

        if (name === "hello_world") {
            return {
                content: [{ type: "text", text: "Hello MCP World!" }],
                isError: false,
            };
        }

        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});

// サーバー起動関数
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Minimal MCP Server running on stdio");
}

// サーバー起動
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});