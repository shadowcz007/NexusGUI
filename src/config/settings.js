// 设置管理模块
const fs = require('fs');
const path = require('path');
const os = require('os');

// 读取 package.json 获取项目信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

// 获取应用数据目录的函数
function getAppDataDir() {
    try {
        const { app } = require('electron');
        return app.getPath('userData');
    } catch (error) {
        // 非Electron环境，使用用户主目录
        return path.join(os.homedir(), '.'+packageJson.name);
    }
}

// 默认设置
const DEFAULT_SETTINGS = {
    server: {
        port: 3000,
        enableCors: true,
        maxConnections: 100,
        sessionTimeout: 300
    },
    logging: {
        enableVerbose: true,
        level: 'info'
    },
    ui: {
        theme: 'light',
        alwaysOnTop: false,
        showInTray: true,
        autoWindowManagement: false // 是否启用自动窗口管理
    },
    // 启动模式设置
    startup: {
        mode: 'tray', // 'tray' 或 'window'
        firstRun: true // 是否首次运行
    },
    name: packageJson.name,
    version: packageJson.version,
    lastModified: new Date().toISOString()
};

class SettingsManager {
    constructor() {
        this.settings = null;
        // 初始化路径
        this.SETTINGS_DIR = path.join(getAppDataDir(), packageJson.name);
        this.SETTINGS_FILE = path.join(this.SETTINGS_DIR, 'settings.json');

        this.ensureSettingsDir();
        this.loadSettings();
    }

    // 确保设置目录存在
    ensureSettingsDir() {
        try {
            if (!fs.existsSync(this.SETTINGS_DIR)) {
                fs.mkdirSync(this.SETTINGS_DIR, { recursive: true });
                console.log(`✅ 创建设置目录: ${this.SETTINGS_DIR}`);
            }
        } catch (error) {
            console.error('❌ 创建设置目录失败:', error);
        }
    }

    // 加载设置
    loadSettings() {
        try {
            if (fs.existsSync(this.SETTINGS_FILE)) {
                const data = fs.readFileSync(this.SETTINGS_FILE, 'utf8');
                const loadedSettings = JSON.parse(data);

                // 合并默认设置和加载的设置，确保新字段有默认值
                this.settings = this.mergeSettings(DEFAULT_SETTINGS, loadedSettings);

                console.log('✅ 设置已从文件加载');
                console.log('📊 当前设置:', this.settings);
            } else {
                // 首次运行，使用默认设置
                this.settings = { ...DEFAULT_SETTINGS };
                this.saveSettings();
                console.log('✅ 使用默认设置并保存到文件');
            }
        } catch (error) {
            console.error('❌ 加载设置失败，使用默认设置:', error);
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    // 深度合并设置对象
    mergeSettings(defaultSettings, userSettings) {
        const merged = { ...defaultSettings };

        for (const key in userSettings) {
            if (userSettings.hasOwnProperty(key)) {
                if (typeof userSettings[key] === 'object' && userSettings[key] !== null && !Array.isArray(userSettings[key])) {
                    merged[key] = this.mergeSettings(defaultSettings[key] || {}, userSettings[key]);
                } else {
                    merged[key] = userSettings[key];
                }
            }
        }

        return merged;
    }

    // 保存设置
    saveSettings() {
        try {
            this.settings.lastModified = new Date().toISOString();
            const data = JSON.stringify(this.settings, null, 2);
            fs.writeFileSync(this.SETTINGS_FILE, data, 'utf8');
            console.log('✅ 设置已保存到文件');
            return true;
        } catch (error) {
            console.error('❌ 保存设置失败:', error);
            return false;
        }
    }

    // 获取所有设置
    getAllSettings() {
        return { ...this.settings };
    }

    // 获取特定设置
    getSetting(key) {
        const keys = key.split('.');
        let value = this.settings;

        for (const k of keys) {
            if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
                value = value[k];
            } else {
                return undefined;
            }
        }

        return value;
    }

    // 设置特定值
    setSetting(key, value) {
        const keys = key.split('.');
        let current = this.settings;

        // 导航到目标对象
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        // 设置值
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;

        console.log(`⚙️ 设置更新: ${key} = ${value} (原值: ${oldValue})`);

        return this.saveSettings();
    }

    // 批量更新设置
    updateSettings(updates) {
        try {
            for (const [key, value] of Object.entries(updates)) {
                this.setSetting(key, value);
            }
            return true;
        } catch (error) {
            console.error('❌ 批量更新设置失败:', error);
            return false;
        }
    }

    // 重置为默认设置
    resetToDefaults() {
        try {
            this.settings = { ...DEFAULT_SETTINGS };
            this.saveSettings();
            console.log('✅ 设置已重置为默认值');
            return true;
        } catch (error) {
            console.error('❌ 重置设置失败:', error);
            return false;
        }
    }

    // 备份设置
    backupSettings() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.SETTINGS_DIR, `settings-backup-${timestamp}.json`);
            const data = JSON.stringify(this.settings, null, 2);
            fs.writeFileSync(backupFile, data, 'utf8');
            console.log(`✅ 设置已备份到: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('❌ 备份设置失败:', error);
            return null;
        }
    }

    // 获取设置文件路径
    getSettingsPath() {
        return this.SETTINGS_FILE;
    }

    // 验证设置
    validateSettings(settings = this.settings) {
        const errors = [];

        // 检查是否是扁平化格式（键名包含点号）
        const isFlattened = Object.keys(settings).some(key => key.includes('.'));

        let validationSettings;
        if (isFlattened) {
            // 扁平化格式：将其转换为嵌套结构进行验证
            validationSettings = this.expandFlattenedSettings(settings);
        } else {
            // 嵌套格式：直接使用
            validationSettings = settings;
        }

        console.log('🔍 验证设置格式:', isFlattened ? '扁平化' : '嵌套');
        console.log('🔍 验证设置内容:', JSON.stringify(validationSettings, null, 2));

        // 验证服务器端口
        const port = validationSettings.server?.port;
        if (port === undefined || port === null || port < 1000 || port > 65535) {
            errors.push(`服务器端口必须在1000-65535之间，当前值: ${port}`);
        }

        // 验证最大连接数
        const maxConnections = validationSettings.server?.maxConnections;
        if (maxConnections === undefined || maxConnections === null || maxConnections < 1 || maxConnections > 10000) {
            errors.push(`最大连接数必须在1-10000之间，当前值: ${maxConnections}`);
        }

        // 验证会话超时
        const sessionTimeout = validationSettings.server?.sessionTimeout;
        if (sessionTimeout === undefined || sessionTimeout === null || sessionTimeout < 60 || sessionTimeout > 7200) {
            errors.push(`会话超时必须在60-7200秒之间，当前值: ${sessionTimeout}`);
        }

        // 验证日志级别
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        const logLevel = validationSettings.logging?.level;
        if (!logLevel || !validLogLevels.includes(logLevel)) {
            errors.push(`日志级别必须是: ${validLogLevels.join(', ')} 之一，当前值: ${logLevel}`);
        }

        console.log('🔍 验证结果:', errors.length === 0 ? '通过' : '失败');
        if (errors.length > 0) {
            console.log('❌ 验证错误:', errors);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // 将扁平化设置转换为嵌套结构
    expandFlattenedSettings(flatSettings) {
        const expanded = {};

        for (const [key, value] of Object.entries(flatSettings)) {
            const keys = key.split('.');
            let current = expanded;

            // 导航到目标位置
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!current[k] || typeof current[k] !== 'object') {
                    current[k] = {};
                }
                current = current[k];
            }

            // 设置值
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
        }

        return expanded;
    }
}

// 创建全局设置管理器实例
const settingsManager = new SettingsManager();

module.exports = {
    SettingsManager,
    settingsManager,
    DEFAULT_SETTINGS
};