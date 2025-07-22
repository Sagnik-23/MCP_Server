import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises"
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";


const server = new McpServer({
    name: "test-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {}
    }
})

server.resource(
    "users",
    "users://all",
    {
        description: "Create a user in the database",
        title: "Users",
        mimeType: "application/json"
    }, async uri => {
        const users = await import("./data/users.json", { with: { type: "json" } }).then(m => m.default);
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(users),
                    mimeType: "application/json"
                }
            ]
        }
    }
)

server.resource("user-details", new ResourceTemplate("users://{userId}/profile", { list: undefined }), {
    description: "User details from the database",
    title: "User Details",
    mimeType: "application/json"
}, async (uri, { userId }) => {
    const users = await import("./data/users.json", { with: { type: "json" } }).then(m => m.default);
    const user = users.find(u => u.id === parseInt(userId as string));

    if (user == null) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify({ error: `User with ID ${userId} not found` }),
                    mimeType: "application/json"
                }
            ]
        }
    }


    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(user),
                mimeType: "application/json"
            }
        ]
    }
})

server.tool("create-user", "Create a user in the database", {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
}, {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async (params) => {
    try {
        const id = await createUser(params)
        return {
            content: [
                {
                    type: "text",
                    text: `User created with ID: ${id}`
                }
            ]
        }
    } catch (error) {
        console.error('Create user error:', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to create user: ${error}`
                }
            ]
        }
    }
});

server.tool("create-random-user", "Create a random user in the database", {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async () => {
    const res = await server.server.request({
        method: "sampling/createMessage",
        params: {
            messages: [{
                role: "user",
                content: {
                    type: "text", text: "Create a random user with a valid name, email, address, and phone number. Return the user details in JSON object with no other text or formatting so it can be used with JSON.parse."
                }
            }],
            maxTokens: 1024,
        }
    }, CreateMessageResultSchema)

    if (res.content.type !== "text"){
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to generate random user."
                }
            ]
        }
    }

    try {
       const fakeUser = JSON.parse(res.content.text.trim().replace(/^```json/, "").replace(/```$/, "").trim());

       const id = await createUser(fakeUser);
       return{
            content: [
                {
                    type: "text",
                    text: `Random user created with ID: ${id}. User details: ${JSON.stringify(fakeUser)}`
                }
            ]
       }
    } catch (error) {
        console.error('Create random user error:', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to create random user: ${error}`
                }
            ]
        }
        
    }
})

server.prompt("generate-fake-user", "Generate a fake user based on a given name", {
    name: z.string()
}, ({ name }) => {
    return {
        messages: [{
            role: "user",
            content: {
                type: "text", text: `Generate a fake user with the name ${name}. The user should have a valid email, address, and phone number.`
            }
        }]
    }
})

async function createUser(user: { name: string, email: string, address: string, phone: string }) {

    const users = await import("./data/users.json", { with: { type: "json" } }).then(m => m.default);

    // // Use fs.readFile and JSON.parse for compatibility
    // const usersPath = './src/data/users.json';
    // const usersRaw = await fs.readFile(usersPath, 'utf-8');
    // const users = JSON.parse(usersRaw);

    const id = users.length + 1;
    users.push({ id, ...user });

    await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));
    return id;
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();