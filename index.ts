#!/usr/bin/env node

// 1.6.1のSDKでは、ESMパスを使用
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// サーバーインスタンスを作成
const server = new McpServer(
    {
        name: "minimal-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {}, // ツール機能
            resources: {}, // リソース機能（必須）
        },
    }
);

// 簡単なHello World toolを定義
server.tool(
    "hello_world", 
    "Returns a friendly 'Hello MCP World' message.",
    async () => {
        return {
            content: [{ type: "text", text: "Hello MCP World!" }],
            isError: false,
        };
    }
);

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