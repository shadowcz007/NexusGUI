const os = require('os');
const osUtils = require('os-utils');

/**
 * 系统监控服务
 * 提供系统资源使用情况的监控功能
 */
class SystemMonitorService {
    constructor() {
        this.lastCpuInfo = this.getCpuInfo();
        this.lastCpuTime = Date.now();
    }

    /**
     * 获取 CPU 信息
     * @returns {object} CPU 信息
     */
    getCpuInfo() {
        const cpus = os.cpus();
        if (!cpus || cpus.length === 0) {
            return { usage: 0, cores: 0, model: 'Unknown' };
        }

        // 计算 CPU 使用率
        let totalIdle = 0, totalTick = 0;
        let cores = cpus.length;
        
        for (let i = 0; i < cores; i++) {
            const cpu = cpus[i];
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }

        return {
            usage: 0, // 初始使用率为0，后续通过差值计算
            cores: cores,
            model: cpus[0].model,
            totalIdle: totalIdle,
            totalTick: totalTick
        };
    }

    /**
     * 获取 CPU 使用率
     * @returns {Promise<number>} CPU 使用率百分比
     */
    async getCpuUsage() {
        return new Promise((resolve) => {
            osUtils.cpuUsage((usage) => {
                resolve(Math.round(usage * 100));
            });
        });
    }

    /**
     * 获取内存信息
     * @returns {object} 内存信息
     */
    getMemoryInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const usagePercent = Math.round((usedMem / totalMem) * 100);

        return {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usagePercent: usagePercent
        };
    }

    /**
     * 获取系统负载
     * @returns {object} 系统负载信息
     */
    getLoadAverage() {
        const loadAvg = os.loadavg();
        return {
            '1min': loadAvg[0],
            '5min': loadAvg[1],
            '15min': loadAvg[2]
        };
    }

    /**
     * 获取磁盘使用情况
     * @returns {object} 磁盘使用情况
     */
    getDiskUsage() {
        try {
            // 在 Electron 环境中，我们可以通过 process.getSystemMemoryInfo 获取一些信息
            const systemMemInfo = process.getSystemMemoryInfo ? process.getSystemMemoryInfo() : null;
            
            return {
                total: os.totalmem(),
                free: os.freemem(),
                systemMemInfo: systemMemInfo
            };
        } catch (error) {
            return {
                total: os.totalmem(),
                free: os.freemem(),
                error: error.message
            };
        }
    }

    /**
     * 获取网络接口信息
     * @returns {Array} 网络接口信息数组
     */
    getNetworkInterfaces() {
        const interfaces = os.networkInterfaces();
        const result = [];

        for (const name in interfaces) {
            const iface = interfaces[name];
            for (const info of iface) {
                if (!info.internal && info.family === 'IPv4') {
                    result.push({
                        name: name,
                        address: info.address,
                        mac: info.mac
                    });
                }
            }
        }

        return result;
    }

    /**
     * 获取系统信息
     * @returns {object} 系统信息
     */
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptime: os.uptime(),
            version: os.version ? os.version() : 'Unknown'
        };
    }

    /**
     * 获取实时监控数据
     * @returns {Promise<object>} 监控数据
     */
    async getMonitorData() {
        const cpuUsage = await this.getCpuUsage();
        const memoryInfo = this.getMemoryInfo();
        const loadAverage = this.getLoadAverage();
        const diskUsage = this.getDiskUsage();
        const networkInterfaces = this.getNetworkInterfaces();
        const systemInfo = this.getSystemInfo();

        return {
            timestamp: new Date().toISOString(),
            cpu: {
                usage: cpuUsage,
                cores: os.cpus().length,
                model: os.cpus().length > 0 ? os.cpus()[0].model : 'Unknown'
            },
            memory: memoryInfo,
            load: loadAverage,
            disk: diskUsage,
            network: networkInterfaces,
            system: systemInfo
        };
    }

    /**
     * 格式化字节大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间
     */
    formatTime(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        let result = '';
        if (days > 0) result += days + '天 ';
        if (hours > 0) result += hours + '小时 ';
        if (minutes > 0) result += minutes + '分钟 ';
        result += seconds + '秒';

        return result.trim();
    }
}

module.exports = { SystemMonitorService };