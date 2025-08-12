const { generateSessionManagerHTML } = require('./generateSessionManagerHTML.js')
const {
    generateDebugWindowHTML
} = require('./generateDebugWindowHTML.js')
const {
    generateServerSettingsHTML
} = require('./generateServerSettingsHTML.js')

const {generateMCPDashboardHTML} = require('./generateMCPDashboardHTML.js')
const {generateStartupWizardHTML} = require('./generateStartupWizardHTML.js')
const {generateTestInterfaceHTML} = require('./generateTestInterfaceHTML.js')
const {generateDebugConsoleHTML} = require('./generateDebugConsoleHTML.js')
const {generateMonitorDashboardHTML} = require('./generateMonitorDashboardHTML.js')
const {generateAPITestToolHTML} = require('./generateAPITestToolHTML.js')

// 使用 CommonJS 导出语法而不是 ES 模块语法
module.exports = {
    generateSessionManagerHTML,
    generateDebugWindowHTML,
    generateServerSettingsHTML,
    generateMCPDashboardHTML,
    generateStartupWizardHTML,
    generateTestInterfaceHTML,
    generateDebugConsoleHTML,
    generateMonitorDashboardHTML,
    generateAPITestToolHTML
}
