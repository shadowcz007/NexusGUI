// CommonJS wrapper for ES Module mcp-server.mjs
let startMCPServer, server;

async function initializeMCPServer() {
    if (!startMCPServer) {
        const mcpModule = await
        import ('./mcp-server.mjs');
        startMCPServer = mcpModule.startMCPServer;
        server = mcpModule.server;
    }
    return { startMCPServer, server };
}

module.exports = { initializeMCPServer };