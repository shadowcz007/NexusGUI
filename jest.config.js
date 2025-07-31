// Jest 测试配置
module.exports = {
    // 测试环境
    testEnvironment: 'jsdom',

    // 测试文件匹配模式
    testMatch: [
        '**/test/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // 覆盖率收集
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        'src/**/*.mjs',
        '!node_modules/**',
        '!dist/**',
        '!build/**'
    ],

    // 覆盖率报告格式
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],

    // 覆盖率输出目录
    coverageDirectory: 'coverage',

    // 模块路径映射
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        'electron': '<rootDir>/test/mocks/electron.js'
    },

    // 设置文件
    setupFilesAfterEnv: [
        '<rootDir>/test/setup.js'
    ],

    // 忽略的文件
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/'
    ],

    // 转换配置
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // 全局变量
    globals: {
        'window': {},
        'document': {},
        'globalThis': global
    },

    // 测试超时
    testTimeout: 10000,

    // 详细输出
    verbose: true
};