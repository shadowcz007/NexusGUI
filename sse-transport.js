// Dynamic import for ES module
let SDKSSEServerTransport;

async function initializeSDK() {
    if (!SDKSSEServerTransport) {
        const sdkSSE = await
        import ('@modelcontextprotocol/sdk/server/sse.js');
        SDKSSEServerTransport = sdkSSE.SSEServerTransport;
    }
}

/**
 * SSE Server Transport for MCP
 * Wrapper around the SDK's SSEServerTransport with additional functionality
 */
class SSEServerTransport {
    constructor(messagesEndpoint, response) {
        this.messagesEndpoint = messagesEndpoint;
        this.response = response;
        this.isConnected = false;
        this.messageQueue = [];
        this.sdkTransport = null;

        // Transport interface callbacks
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;

        // console.log(`🔧 创建 SSEServerTransport 实例`);
        // console.log(`🔧 Messages endpoint: ${messagesEndpoint}`);
        // console.log(`🔧 Response object:`, response ? '已提供' : '未提供');
    }

    async start() {
        // console.log(`🚀 开始启动 SSE 传输层...`);

        if (this.isConnected) {
            console.log(`⚠️ 传输层已经连接，跳过启动`);
            return;
        }

        try {
            // Initialize SDK and create the underlying transport
            // console.log(`📦 正在初始化 SDK...`);
            await initializeSDK();

            // console.log(`🔧 创建 SDK SSEServerTransport 实例...`);
            this.sdkTransport = new SDKSSEServerTransport(this.messagesEndpoint, this.response);
            // console.log(`✅ SDK 传输层创建成功`);

            // Set up the SDK transport callbacks
            this.sdkTransport.onclose = () => {
                // console.log(`🔌 SDK 传输层关闭回调被触发`);
                this.isConnected = false;
                if (this.onclose) {
                    console.log(`🔄 调用用户定义的关闭回调`);
                    this.onclose();
                }
            };

            this.sdkTransport.onerror = (error) => {
                console.error(`❌ SDK 传输层错误:`, error);
                if (this.onerror) {
                    console.log(`🔄 调用用户定义的错误回调`);
                    this.onerror(error);
                }
            };

            this.sdkTransport.onmessage = (message) => {
                // console.log(`📨 SDK 传输层收到消息:`, message);
                if (this.onmessage) {
                    // console.log(`🔄 调用用户定义的消息回调`);
                    this.onmessage(message);
                }
            };

            // Start the SSE connection using the SDK implementation
            // console.log(`🔄 正在启动 SDK 传输层...`);
            await this.sdkTransport.start();
            // console.log(`✅ SDK 传输层启动成功`);

            this.isConnected = true;
            // console.log(`✅ SSE transport connected with session ID: ${this.sessionId}`);
            // console.log(`📊 传输层状态:`, {
            //     isConnected: this.isConnected,
            //     sessionId: this.sessionId,
            //     hasSDKTransport: !!this.sdkTransport
            // });
        } catch (error) {
            console.error(`❌ 启动 SSE 传输层时出错:`, error);
            console.error(`❌ 错误堆栈:`, error.stack);
            throw error;
        }
    }

    async close() {
        console.log(`🔌 正在关闭 SSE 传输层...`);

        if (!this.isConnected) {
            console.log(`⚠️ 传输层未连接，跳过关闭`);
            return;
        }

        this.isConnected = false;

        try {
            // Close using the SDK implementation
            if (this.sdkTransport) {
                // console.log(`🔄 正在关闭 SDK 传输层...`);
                await this.sdkTransport.close();
                // console.log(`✅ SDK 传输层关闭成功`);
            }

            // console.log(`✅ SSE transport closed for session: ${this.sessionId}`);
        } catch (error) {
            console.error(`❌ 关闭 SSE 传输层时出错:`, error);
            console.error(`❌ 错误堆栈:`, error.stack);
            throw error;
        }
    }

    async send(message) {
        // console.log(`📤 正在发送消息:`, message);

        if (!this.isConnected || !this.sdkTransport) {
            console.error(`❌ 传输层未连接，无法发送消息`);
            throw new Error('Transport not connected');
        }

        try {
            // Send the message through the SDK's send method
            // console.log(`🔄 通过 SDK 传输层发送消息...`);
            await this.sdkTransport.send(message);
            // console.log(`✅ 消息发送成功`);
        } catch (error) {
            console.error(`❌ 发送消息时出错:`, error);
            console.error(`❌ 错误堆栈:`, error.stack);
            throw error;
        }
    }

    async handlePostMessage(request, response, body) {
        // console.log(`📨 处理 POST 消息...`);
        // console.log(`🔍 Request:`, {
        //     url: request.url,
        //     method: request.method,
        //     headers: request.headers
        // });
        // console.log(`🔍 Response:`, {
        //     headersSent: response.headersSent,
        //     statusCode: response.statusCode
        // });

        // 记录请求体信息
        // if (body) {
        //     if (Buffer.isBuffer(body)) {
        //         console.log(`🔍 Body (Buffer): ${body.length} bytes`);
        //         console.log(`🔍 Body content:`, body.toString());
        //     } else {
        //         console.log(`🔍 Body:`, body);
        //     }
        // }

        try {
            // Use the SDK's handlePostMessage method
            if (this.sdkTransport) {
                // console.log(`🔄 调用 SDK 传输层的 handlePostMessage 方法...`);

                // 确保 request.body 是原始流
                // SDK 会自己处理流读取

                await this.sdkTransport.handlePostMessage(request, response);
                // console.log(`✅ SDK 传输层处理完成`);
            } else {
                console.error(`❌ SDK 传输层不存在，无法处理消息`);
                if (!response.headersSent) {
                    response.status(500).json({
                        error: 'SDK transport not available',
                        message: 'The underlying SDK transport is not initialized'
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error handling POST message:', error);
            console.error('❌ 错误堆栈:', error.stack);

            // 调用用户定义的错误回调
            if (this.onerror) {
                console.log(`🔄 调用用户定义的错误回调`);
                this.onerror(error);
            }

            if (!response.headersSent) {
                response.status(500).json({
                    error: 'Error handling request',
                    details: error.message,
                    stack: error.stack
                });
            }
        }
    }

    // Getter for session ID
    get sessionId() {
        const sessionId = this.sdkTransport ? this.sdkTransport.sessionId : null;
        // console.log(`🔍 获取会话 ID: ${sessionId}`);
        return sessionId;
    }
}

module.exports = { SSEServerTransport };