# MCP Server and Client

This project is a Model Context Protocol (MCP) server and client implementation in TypeScript. It allows you to run an MCP server, interact with it using a client, and manage resources and tools such as user creation and querying.

## Features
- MCP server with resource and tool definitions
- User management (create, list, etc.)
- Interactive client with prompts for tools, resources, and queries
- Integration with Google Generative AI (Gemini)
- TypeScript-based codebase

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd MCP_Server
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Build
To compile TypeScript to JavaScript:
```sh
npm run server:build
```

### Run the Server
To start the MCP server:
```sh
npm run server:dev
```

### Run the Client
To start the interactive client:
```sh
npm run server:dev
```

## Usage
- The client will prompt you to select actions: Query, Tools, Resources, Prompts, or Exit.
- For tools (e.g., user creation), enter the required fields as prompted.
- For resources, select and provide any required parameters.
- For prompts, interact with AI-powered text generation.

## Project Structure
```
MCP_Server/
├── src/
│   ├── server.ts      # MCP server implementation
│   ├── client.ts      # Interactive client
│   └── data/
│       └── users.json # User data storage
├── build/             # Compiled JS output
├── package.json       # Project configuration
├── tsconfig.json      # TypeScript configuration
└── README.md          # Project documentation
```

## Environment Variables
- To use Google Generative AI, set your API key in a `.env` file:
  ```env
  GEMINI_API_KEY=your-google-api-key
  ```

## License
ISC

## Author
Sagnik-23
