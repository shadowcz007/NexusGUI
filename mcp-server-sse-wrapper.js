// CommonJS wrapper for ES Module mcp-server-sse.js
let sseServer;

async function initializeSSEMCPServer() {
    if (!sseServer) {
        const mcpModule = await
        import ('./mcp-server-sse.js');
        sseServer = mcpModule.createServer;
    }
    return { sseServer };
}

module.exports = { initializeSSEMCPServer };