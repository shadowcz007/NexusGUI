/**
 * LLM功能测试脚本
 * 用于测试LLM类型检测功能
 */

const { settingsManager } = require('../src/config/settings.js');
const LLMTypeDetector = require('../src/mcp/sse/tools/LLMTypeDetector');

async function testLLMTypeDetection() {
    console.log('🧪 开始测试 LLM 类型检测功能...');
    
    try {
        // 检查LLM功能是否启用
        const llmEnabled = settingsManager.getSetting('llm.enabled');
        if (!llmEnabled) {
            console.log('⚠️ LLM功能未启用，请在设置中启用LLM功能');
            return;
        }

        // 测试用例
        const testCases = [
            {
                name: 'HTML内容测试',
                content: '<div><h1>测试标题</h1><p>这是一个段落</p></div>',
                expected: 'html'
            },
            {
                name: 'Markdown内容测试',
                content: '# 测试标题\n\n这是一个段落\n\n- 列表项1\n- 列表项2',
                expected: 'markdown'
            },
            {
                name: 'URL测试',
                content: 'https://www.example.com',
                expected: 'url'
            }
        ];

        // 执行测试
        for (const testCase of testCases) {
            console.log(`\n🔍 测试: ${testCase.name}`);
            console.log(`📝 内容: ${testCase.content.substring(0, 50)}${testCase.content.length > 50 ? '...' : ''}`);
            
            try {
                const detectedType = await LLMTypeDetector.detectType(testCase.content);
                console.log(`✅ 检测结果: ${detectedType} (期望: ${testCase.expected})`);
                
                if (detectedType === testCase.expected) {
                    console.log('🎉 检测正确');
                } else {
                    console.log('❌ 检测错误');
                }
            } catch (error) {
                console.log(`❌ 检测失败: ${error.message}`);
            }
        }
        
        console.log('\n✅ LLM类型检测测试完成');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testLLMTypeDetection().catch(console.error);
}

module.exports = { testLLMTypeDetection };