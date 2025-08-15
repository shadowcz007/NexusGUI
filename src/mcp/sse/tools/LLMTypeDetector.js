const { settingsManager } = require('../../../config/settings.js');

/**
 * LLM类型检测工具
 * 用于根据内容自动判断最适合的类型
 */
class LLMTypeDetector {
    /**
     * 检测内容类型
     * @param {string} content - 要检测的内容
     * @returns {Promise<string>} 检测到的类型 ('html', 'url', 'markdown', 'image')
     */
    static async detectType(content) {
        // 检查LLM功能是否启用
        const llmEnabled = settingsManager.getSetting('llm.enabled');
        if (!llmEnabled) {
            throw new Error('LLM功能未启用，请在设置中启用LLM功能');
        }

        // 获取LLM配置
        const llmConfig = {
            apiUrl: settingsManager.getSetting('llm.apiUrl'),
            apiKey: settingsManager.getSetting('llm.apiKey'),
            model: settingsManager.getSetting('llm.model')
        };

        // 验证配置
        if (!llmConfig.apiUrl || !llmConfig.apiKey || !llmConfig.model) {
            throw new Error('LLM配置不完整，请检查API URL、API Key和模型设置');
        }

        // 构造提示词
        const prompt = this.constructPrompt(content);

        try {
            // 调用LLM API
            const result = await this.callLLM(llmConfig, prompt);
            
            // 解析结果
            const detectedType = this.parseLLMResponse(result);
            
            // 验证类型
            const validTypes = ['html', 'url', 'markdown', 'image'];
            if (!validTypes.includes(detectedType)) {
                throw new Error(`LLM返回了无效的类型: ${detectedType}`);
            }
            
            return detectedType;
        } catch (error) {
            throw new Error(`LLM类型检测失败: ${error.message}`);
        }
    }

    /**
     * 构造提示词
     * @param {string} content - 内容
     * @returns {string} 提示词
     */
    static constructPrompt(content) {
        // 如果内容过长，截取前一部分
        const maxLength = 2000;
        const truncatedContent = content.length > maxLength 
            ? content.substring(0, maxLength) + '...' 
            : content;

        return `请根据以下内容判断其最适合的类型。只需回答类型名称，不要添加其他解释。

可选类型：
- html: HTML代码或包含HTML标签的内容
- url: 网络链接或本地文件路径
- markdown: Markdown格式的内容
- image: 图片数据或图片路径

内容：
${truncatedContent}

类型:`;
    }

    /**
     * 调用LLM API
     * @param {Object} config - LLM配置
     * @param {string} prompt - 提示词
     * @returns {Promise<string>} LLM响应
     */
    static async callLLM(config, prompt) {
        const { apiUrl, apiKey, model } = config;
        
        const payload = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,  // 低温度值以获得更确定的结果
            max_tokens: 20     // 类型名称很短，不需要太多token
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API调用失败 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('LLM API返回了无效的响应格式');
        }

        return data.choices[0].message.content.trim().toLowerCase();
    }

    /**
     * 解析LLM响应
     * @param {string} response - LLM响应
     * @returns {string} 解析后的类型
     */
    static parseLLMResponse(response) {
        // 移除可能的标点符号和多余空格
        let type = response.replace(/[.,;:!?]/g, '').trim().toLowerCase();
        
        // 处理常见的别名
        const typeMap = {
            'html code': 'html',
            'html content': 'html',
            'hyperlink': 'url',
            'link': 'url',
            'file path': 'url',
            'markdown content': 'markdown',
            'md': 'markdown',
            'picture': 'image',
            'img': 'image',
            'photo': 'image'
        };
        
        return typeMap[type] || type;
    }
}

module.exports = LLMTypeDetector;