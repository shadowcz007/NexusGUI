const { createServer } = require('./mcp-server-sse.js');

// 启动服务器进行测试
const { server } = createServer(3000);

console.log('🧪 测试服务器已启动在端口 3000');
console.log('📡 测试端点:');
console.log('  - SSE 连接: http://localhost:3000/mcp');
console.log('  - 健康检查: http://localhost:3000/health');
console.log('  - 调试信息: http://localhost:3000/debug/sessions');

// 模拟一些测试请求
setTimeout(async() => {
    console.log('\n🧪 开始测试请求...');

    try {
        // 测试健康检查
        const healthResponse = await fetch('http://localhost:3000/health');
        const healthData = await healthResponse.json();
        console.log('✅ 健康检查响应:', healthData);

        // 测试调试端点
        const debugResponse = await fetch('http://localhost:3000/debug/sessions');
        const debugData = await debugResponse.json();
        console.log('✅ 调试信息响应:', debugData);

    } catch (error) {
        console.error('❌ 测试请求失败:', error);
    }
}, 2000);

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭测试服务器...');
    server.close(() => {
        console.log('✅ 测试服务器已关闭');
        process.exit(0);
    });
});