import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { confirm, input, select } from "@inquirer/prompts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateMessageRequestSchema, Prompt, PromptMessage, Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateText, jsonSchema, ToolSet } from "ai";
import "dotenv/config"

const mcp = new Client({
    name: "test-client-video", version: "1.0.0",
}, {
    capabilities: { sampling: {} }
})

const transport = new StdioClientTransport({
    command: "node",
    args: ["build/server.js"],
    stderr: "ignore"
})

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})


async function main() {
    await mcp.connect(transport);
    const [{ tools }, { prompts }, { resources }, { resourceTemplates }] = await Promise.all([
        mcp.listTools(),
        mcp.listPrompts(),
        mcp.listResources(),
        mcp.listResourceTemplates(),
    ])

    mcp.setRequestHandler(CreateMessageRequestSchema, async request => {
        const texts: string[] = [];
        for (const message of request.params.messages) {
            const result = await handleServerMessagePrompt(message)
            if (result != null) {
                texts.push(result);
            }
        }

        return {
            role: "user",
            model: "gemini-2.0-flash",
            stopReason: "end_turn",
            content: {
                type: "text",
                text: texts.join("\n")
            }

        }
    })
    console.log("You are Connected to the MCP server!");
    while (true) {
        const options = await select({
            message: "What would you like to do?",
            choices: [
                "Query", "Tools", "Resources", "Prompts", "Exit"
            ]
        })

        switch (options) {
            case "Tools": {
                const toolName = await select({
                    message: "Select a tool to use",
                    choices: tools.map(t => ({
                        name: t.annotations?.title || t.name,
                        value: t.name,
                        description: t.description || "No description available"
                    }))
                })
                const tool = tools.find(t => t.name === toolName);
                if (tool == null) {
                    console.error("Tool not found");
                }
                else {
                    await handleTool(tool);
                }
                break;

            }
            case "Resources": {
                const resourceUri = await select({
                    message: "Select a resource to use",
                    choices: [
                        ...resources.map(r => ({
                            name: (r.annotations as { name: string })?.name,
                            value: r.uri,
                            description: r.description || "No description available"
                        })),
                        ...resourceTemplates.map(t => ({
                            name: (t.annotations as { name: string })?.name,
                            value: t.uriTemplate,
                            description: t.description || "No description available"
                        }))
                    ]
                })
                const uri = resources.find(r => r.uri === resourceUri)?.uri ?? resourceTemplates.find(r => r.uriTemplate === resourceUri)?.uriTemplate

                if (uri == null) {
                    console.error("Resource not found");
                }
                else {
                    await handleResource(uri);
                }
                break;
            }
            case "Prompts": {
                const promptName = await select({
                    message: "Select a prompt to use",
                    choices: prompts.map(p => ({
                        name: p.name,
                        value: p.name,
                        description: p.description || "No description available"
                    }))
                })

                const prompt = prompts.find(p => p.name === promptName);
                if (prompt == null) {
                    console.error("Prompt not found");
                }
                else {
                    await handlePrompt(prompt);
                }
            }
            case "Query": {
                await handleQuery(tools)

            }
        }
    }
}

async function handleQuery(tools: Tool[]) {
    const query = await input({ message: "Enter your query:" });

    const { text, toolResults } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: query,
        tools: tools.reduce((obj, tool) => ({
            ...obj,
            [tool.name]: {
                description: tool.description,
                parameters: jsonSchema(tool.inputSchema),
                execute: async (args: Record<string, any>) => {
                    return await mcp.callTool({
                        name: tool.name,
                        arguments: args
                    });
                }
            }
        }), {} as ToolSet)
    })
    // @ts-expect-error
    console.log(text || toolResults[0]?.result?.content[0]?.text || "No text content returned");

}
async function handlePrompt(prompt: Prompt) {
    const args: Record<string, string> = {};

    for (const arg of prompt.arguments ?? []) {
        args[arg.name] = await input({
            message: `Enter value for ${arg.name}:`,
        });
    }

    const response = await mcp.getPrompt({
        name: prompt.name,
        arguments: args
    });

    for (const content of response.messages) {
        console.log(await handleServerMessagePrompt(content));
    }
}


async function handleServerMessagePrompt(message: PromptMessage) {
    if (message.content.type !== "text") return

    console.log(message.content.text || "No text content returned");
    const run = await confirm({
        message: "Do you want to run this prompt?",
        default: true
    })

    if (!run) return;

    const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: message.content.text,
    })
    return text
}
async function handleResource(uri: string) {

    let finalUri = uri;
    const paramMatch = uri.matchAll(/\{([^}]+)\}/g);

    if (paramMatch !== null) {
        for (const param of paramMatch) {
            const paramName = param[1];
            const paramValue = await input({
                message: `Enter value for parameter ${paramName}:`
            })
            finalUri = finalUri.replace(param[0], paramValue);

        }
    }

    const res = await mcp.readResource({
        uri: finalUri
    })

    console.log(JSON.stringify(JSON.parse(res.contents[0].text as string), null, 2));
}
async function handleTool(tool: Tool) {

    const args: Record<string, string> = {};

    for (const [key, value] of Object.entries(tool.inputSchema.properties ?? {})) {
        args[key] = await input({
            message: `Enter value for ${key} (${(value as { type: string }).type}):`,
        })
    }

    const res = await mcp.callTool({
        name: tool.name,
        arguments: args
    })

    console.log((res.content as [{ text: string }])[0].text || "No text content returned");
}

main()