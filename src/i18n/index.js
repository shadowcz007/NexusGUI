const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class I18nManager {
  constructor() {
    this.translations = {};
    this.currentLocale = 'en-US'; // 默认语言
    this.supportedLocales = ['en-US', 'zh-CN'];
    this.loadTranslations();
  }

  /**
   * 加载所有翻译文件
   */
  loadTranslations() {
    this.supportedLocales.forEach(locale => {
      const filePath = path.join(__dirname, `${locale}.json`);
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        this.translations[locale] = JSON.parse(data);
        console.log(`已加载 ${locale} 语言包`);
      } catch (error) {
        console.error(`加载 ${locale} 语言包失败:`, error);
      }
    });
  }

  /**
   * 自动检测系统语言
   */
  detectSystemLanguage() {
    try {
      const systemLocale = app.getLocale();
      console.log('检测到系统语言:', systemLocale);
      
      // 映射系统语言到支持的语言
      const localeMap = {
        'zh': 'zh-CN',
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-CN',
        'zh-HK': 'zh-CN',
        'en': 'en-US',
        'en-US': 'en-US',
        'en-GB': 'en-US'
      };

      // 首先尝试完全匹配
      if (localeMap[systemLocale]) {
        return localeMap[systemLocale];
      }

      // 然后尝试语言代码匹配（如 zh-CN -> zh）
      const languageCode = systemLocale.split('-')[0];
      if (localeMap[languageCode]) {
        return localeMap[languageCode];
      }

      // 默认返回英文
      return 'en-US';
    } catch (error) {
      console.error('检测系统语言失败:', error);
      return 'en-US';
    }
  }

  /**
   * 初始化语言设置
   */
  async initialize() {
    // 首先尝试加载用户偏好
    const userPreference = await this.loadUserPreference();
    
    if (userPreference && userPreference.locale && this.translations[userPreference.locale]) {
      // 使用用户偏好的语言
      this.currentLocale = userPreference.locale;
      console.log('使用用户偏好语言:', this.currentLocale);
    } else {
      // 自动检测系统语言
      const detectedLocale = this.detectSystemLanguage();
      this.currentLocale = detectedLocale;
      console.log('使用系统检测语言:', this.currentLocale);
      
      // 保存检测到的语言作为用户偏好
      await this.saveUserPreference({ locale: detectedLocale, autoDetected: true });
    }
  }

  /**
   * 设置当前语言
   */
  async setLocale(locale) {
    if (this.translations[locale]) {
      this.currentLocale = locale;
      await this.saveUserPreference({ locale, autoDetected: false });
      console.log('语言已切换到:', locale);
      return true;
    }
    console.error('不支持的语言:', locale);
    return false;
  }

  /**
   * 保存用户偏好
   */
  async saveUserPreference(preferences) {
    try {
      const userDataPath = app.getPath('userData');
      const prefsPath = path.join(userDataPath, 'preferences.json');
      
      let existingPrefs = {};
      try {
        if (fs.existsSync(prefsPath)) {
          const data = fs.readFileSync(prefsPath, 'utf8');
          existingPrefs = JSON.parse(data);
        }
      } catch (error) {
        console.warn('读取现有偏好设置失败:', error);
      }
      
      // 合并偏好设置
      const updatedPrefs = { ...existingPrefs, ...preferences };
      
      // 确保目录存在
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      
      fs.writeFileSync(prefsPath, JSON.stringify(updatedPrefs, null, 2));
      console.log('用户偏好已保存:', updatedPrefs);
    } catch (error) {
      console.error('保存用户偏好失败:', error);
    }
  }

  /**
   * 加载用户偏好
   */
  async loadUserPreference() {
    try {
      const userDataPath = app.getPath('userData');
      const prefsPath = path.join(userDataPath, 'preferences.json');
      
      if (fs.existsSync(prefsPath)) {
        const data = fs.readFileSync(prefsPath, 'utf8');
        const preferences = JSON.parse(data);
        console.log('已加载用户偏好:', preferences);
        return preferences;
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
    }
    return null;
  }

  /**
   * 翻译函数，支持嵌套键（如 "app.title"）
   */
  t(key, fallback = null) {
    const keys = key.split('.');
    let result = this.translations[this.currentLocale];
    
    for (const k of keys) {
      if (result && typeof result === 'object' && result[k] !== undefined) {
        result = result[k];
      } else {
        // 如果找不到翻译，尝试使用英文作为后备
        if (this.currentLocale !== 'en-US' && this.translations['en-US']) {
          let fallbackResult = this.translations['en-US'];
          for (const fk of keys) {
            if (fallbackResult && typeof fallbackResult === 'object' && fallbackResult[fk] !== undefined) {
              fallbackResult = fallbackResult[fk];
            } else {
              fallbackResult = null;
              break;
            }
          }
          if (fallbackResult && typeof fallbackResult === 'string') {
            console.warn(`翻译缺失 [${this.currentLocale}]: ${key}, 使用英文后备`);
            return fallbackResult;
          }
        }
        
        // 如果提供了自定义后备文本，使用它
        if (fallback) {
          console.warn(`翻译缺失: ${key}, 使用自定义后备文本`);
          return fallback;
        }
        
        // 最后返回键名
        console.warn(`翻译缺失: ${key}, 返回键名`);
        return key;
      }
    }
    
    return typeof result === 'string' ? result : key;
  }

  /**
   * 获取当前语言
   */
  getCurrentLocale() {
    return this.currentLocale;
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLocales() {
    return this.supportedLocales;
  }

  /**
   * 获取语言显示名称
   */
  getLocaleDisplayName(locale) {
    const displayNames = {
      'en-US': 'English',
      'zh-CN': '简体中文'
    };
    return displayNames[locale] || locale;
  }

  /**
   * 检查是否支持指定语言
   */
  isLocaleSupported(locale) {
    return this.supportedLocales.includes(locale);
  }
}

// 创建单例实例
const i18n = new I18nManager();

module.exports = i18n;