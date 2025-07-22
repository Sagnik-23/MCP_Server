"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompts_1 = require("@inquirer/prompts");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const mcp = new index_js_1.Client({
    name: "test-client-video", version: "1.0.0",
}, {
    capabilities: { sampling: {} }
});
const transport = new stdio_js_1.StdioClientTransport({
    command: "node",
    args: ["build/server.js"],
    stderr: "ignore"
});
async function main() {
    await mcp.connect(transport);
    const [{ tools }, { prompts }, { resources }, { resourceTemplates }] = await Promise.all([
        mcp.listTools(),
        mcp.listPrompts(),
        mcp.listResources(),
        mcp.listResourceTemplates(),
    ]);
    console.log("You are Connected to the MCP server!");
    while (true) {
        const options = await (0, prompts_1.select)({
            message: "What would you like to do?",
            choices: [
                "Query", "Tools", "Resources", "Prompts", "Exit"
            ]
        });
        switch (options) {
            case "Tools": {
                const tool = await (0, prompts_1.select)({
                    message: "Select a tool to use",
                    choices: tools.map(t => ({
                        name: t.annotations?.title || t.name,
                        value: t.name,
                        description: t.description || "No description available"
                    }))
                });
                console.log(`You selected tool: ${tool}`);
            }
        }
    }
}
