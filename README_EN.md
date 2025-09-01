# NexusGUI

English | [中文](./README.md)

Pass GUI definitions through MCP to enable AI-generated interfaces with desktop rendering

## 🎥 Demo Video

Watch the complete feature demonstration: [NexusGUI Demo Video](https://youtu.be/8ubN6-mrO_A?si=dNy2Wv3-kXNt_ZN0)

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Launch Application
```bash
# System tray mode (recommended)
npm start

# Or launch with main window
npm run start-with-window
```

### Using MCP Tools
After startup, the application will launch an MCP server at `http://localhost:3001`. You can use it as follows:

1. **Connect to MCP Server**: `http://localhost:3001/mcp`
2. **Call render-gui tool**:
```javascript
{
  "title": "My First Interface",
  "width": 600,
  "height": 400,
  "type": "html",
  "content": "<div style='padding: 20px; text-align: center;'><h1>Hello NexusGUI!</h1><p>This is my first dynamic interface</p></div>"
}
```

## 🆕 Latest Features

### 🆕 Refactored Modular Architecture
- ✅ **Object-Oriented Design**: Class-based tool architecture for improved maintainability
- ✅ **Tool Registry**: Unified management of all MCP tool registration, lookup, and execution
- ✅ **Plugin-based Extension**: New tools only need to inherit base class and register, supports hot-swapping
- ✅ **Schema Separation**: Tool definitions separated from implementation for easier maintenance
- ✅ **Unit Testing**: Each tool can be tested independently, improving code quality
- ✅ **Error Isolation**: Individual tool errors don't affect other tools

### System Tray Integration 🆕
- ✅ Support system tray mode without keeping main window open
- ✅ Right-click tray icon to access MCP server console and debug features
- ✅ Real-time display of server status, port, and active session information
- ✅ Integrated health check, debug info, session management tools
- ✅ Support server settings and configuration management
- ✅ Cross-platform support (macOS, Windows, Linux)


- ✅ Add network status indicator, display connection status with AI tools

### Direct HTML Rendering Mode 🆕
- ✅ Support direct HTML string input for interface rendering
- ✅ Support HTML file path rendering (HTML strings take priority)
- ✅ Fully customizable interface layout and styling
- ✅ Support JavaScript event handling and interaction
- ✅ Built-in `electronAPI.sendResult()` function for synchronous result waiting

### HTML to Markdown Document Caching 🆕
- ✅ Automatically convert HTML content to high-quality Markdown format
- ✅ Intelligently save Markdown files to system temporary directory
- ✅ Support getting Markdown file paths and direct content reading
- ✅ Provide flexible cache retrieval methods (HTML, Markdown, or both)
- ✅ Complete document caching and reading functionality for AI processing and version management

### Window Reuse Feature 🆕
- ✅ Support reusing existing windows instead of destroying and recreating
- ✅ Control window reuse behavior via `reuseWindow` parameter
- ✅ Maintain window state and position for better user experience
- ✅ Reduce resource consumption and improve performance

### Synchronous Result Waiting 🆕
- ✅ Support `waitForResult` parameter for synchronous window operation results
- ✅ Return data when window closes or submits results
- ✅ Suitable for scenarios requiring user input confirmation

### Window Property Settings
- ✅ Support rich window property configuration (menu bar, borders, transparency, fullscreen, etc.)
- ✅ Support window size constraints (min/max width/height)
- ✅ Support window behavior control (always on top, taskbar display, resizable, etc.)
- ✅ Support window appearance settings (opacity, zoom factor, fullscreen mode)

### Debug Functionality Enhancement
- ✅ Provide unified debug console, centralize all logs and debug information
- ✅ Add real-time monitoring panel, display server status, session count, resource usage, etc.
- ✅ Provide API testing tool, facilitate developer testing of MCP tool calls

## 🆕 Refactored Architecture

### Modular Tool System 🆕
- ✅ **Object-Oriented Design**: Class-based tool architecture for improved code maintainability
- ✅ **Tool Registry**: Unified management of all MCP tool registration, lookup, and execution
- ✅ **Plugin-based Extension**: New tools only need to inherit base class and register, supports hot-swapping
- ✅ **Schema Separation**: Tool definitions separated from implementation for easier maintenance and extension
- ✅ **Unit Testing**: Each tool can be tested independently, improving code quality
- ✅ **Error Isolation**: Individual tool errors don't affect other tools

## Project Structure

```
NexusGUI/
├── src/                    # Source code directory
│   ├── main/              # Main process code
│   │   ├── main.js        # Electron main process
│   │   └── preload.js     # Preload script
│   ├── renderer/          # Renderer process code
│   │   ├── renderer.js    # Dynamic interface renderer
│   │   ├── index.html     # Main interface HTML
│   │   └── styles.css     # Style files
│   └── mcp/               # MCP server code
│       ├── sse/           # SSE transport related
│       │   ├── server.js  # Refactored SSE MCP server
│       │   ├── wrapper.js # SSE server wrapper
│       │   ├── transport.js # SSE transport layer
│       │   ├── tools/     # 🆕 Tool modules directory
│       │   │   ├── BaseToolHandler.js    # Base tool handler
│       │   │   ├── ToolRegistry.js       # Tool registry
│       │   │   ├── RenderGUITool.js      # GUI rendering tool
│       │   │   ├── InjectJSTool.js       # JS injection tool
│       │   │   ├── NotificationTool.js   # Notification tool
│       │   │   ├── index.js             # Unified exports
│       │   │   ├── test.js              # Tool tests
│       │   │   └── README.md            # Architecture documentation
│       │   ├── schemas/   # 🆕 Schema definitions directory
│       │   │   ├── renderGUISchema.js    # GUI tool schema
│       │   │   ├── injectJSSchema.js     # JS injection tool schema
│       │   │   └── notificationSchema.js # Notification tool schema
│       │   ├── utils/     # 🆕 Utility classes directory
│       │   │   └── htmlUtils.js         # HTML processing utilities
│       │   ├── validators/ # 🆕 Validators directory
│       │   └── MIGRATION.md # 🆕 Refactoring migration guide
│       └── stdio/         # Standard transport related (backup)
│           ├── server.mjs # Standard MCP server
│           └── wrapper.js # Standard server wrapper
├── test/                  # Test files
│   ├── setup.js          # Test environment setup
│   └── renderer.test.js  # Renderer tests
├── tools/                 # Tools and debugging
│   ├── diagnose.js       # Diagnostic tool
│   └── test-debug.js     # Test debug script
├── package.json          # Project configuration
├── jest.config.js        # Jest test configuration
└── README.md            # Project documentation
```

## File Descriptions

### Core Files
- **`src/main/main.js`**: Electron main process, handles window management and MCP server integration
- **`src/main/preload.js`**: Preload script providing secure IPC communication interface
- **`src/renderer/renderer.js`**: Dynamic interface renderer, receives GUI definitions and creates interfaces
- **`src/renderer/index.html`**: Main interface HTML template
- **`src/renderer/styles.css`**: Interface style files

### MCP Server (Refactored)
- **`src/mcp/sse/server.js`**: Refactored SSE MCP server (using modular architecture)
- **`src/mcp/sse/wrapper.js`**: SSE server wrapper
- **`src/mcp/sse/transport.js`**: SSE transport layer implementation

### 🆕 Tool System Architecture
- **`src/mcp/sse/tools/BaseToolHandler.js`**: Base tool handler (abstract base class)
- **`src/mcp/sse/tools/ToolRegistry.js`**: Tool registry (unified management)
- **`src/mcp/sse/tools/RenderGUITool.js`**: GUI rendering tool implementation
- **`src/mcp/sse/tools/InjectJSTool.js`**: JavaScript injection tool implementation
- **`src/mcp/sse/tools/NotificationTool.js`**: Notification tool implementation
- **`src/mcp/sse/tools/index.js`**: Tool module unified exports
- **`src/mcp/sse/tools/test.js`**: Tool system test file
- **`src/mcp/sse/tools/README.md`**: Detailed architecture documentation

### 🆕 Schema Definitions
- **`src/mcp/sse/schemas/renderGUISchema.js`**: GUI rendering tool schema definition
- **`src/mcp/sse/schemas/injectJSSchema.js`**: JS injection tool schema definition
- **`src/mcp/sse/schemas/notificationSchema.js`**: Notification tool schema definition

### 🆕 Utilities and Validators
- **`src/mcp/sse/utils/htmlUtils.js`**: HTML processing and window configuration validation utilities
- **`src/mcp/sse/validators/`**: Validators directory (reserved for extension)
- **`src/mcp/sse/MIGRATION.md`**: Refactoring migration guide and best practices

### Backup Server
- **`src/mcp/stdio/server.mjs`**: Standard transport MCP server (backup)
- **`src/mcp/stdio/wrapper.js`**: Standard server wrapper

### Tests and Tools
- **`test/`**: Jest test files
- **`tools/diagnose.js`**: System diagnostic tool
- **`tools/test-debug.js`**: Server test debug script

## Launch Options

### System Tray Mode (Recommended)
```bash
# Tray mode startup (default)
npm start

# Launch with main window
npm run start-with-window

# Development mode
npm run dev
```

### Other Launch Options
```bash
# Run tests
npm test

# Build application
npm run build
```

### MCP Server Endpoints
After startup, the MCP server provides services at the following endpoints:
- **SSE Connection**: `http://localhost:3001/mcp`
- **Message Processing**: `http://localhost:3001/messages`
- **Health Check**: `http://localhost:3001/health`
- **Debug Information**: `http://localhost:3001/debug/sessions`

## Window Reuse Feature

### Basic Usage

```javascript
// Reuse existing window
{
  "title": "Reused Window",
  "width": 800,
  "height": 600,
  "reuseWindow": true,  // Key parameter: enable window reuse
  "components": [
    { "type": "heading", "text": "Reused Window", "level": 1 },
    { "type": "text", "text": "This window reuses the previous window" },
    { "type": "button", "text": "Click Me", "onClick": "handleClick" }
  ],
  "callbacks": {
    "handleClick": "alert('Button in reused window was clicked!');"
  }
}
```

### Window Reuse vs New Window

```javascript
// Method 1: Create new window (default behavior)
{
  "title": "New Window",
  "reuseWindow": false,  // Or don't set this parameter
  "components": [...]
}

// Method 2: Reuse existing window
{
  "title": "Reused Window",
  "reuseWindow": true,   // Enable reuse
  "components": [...]
}
```

### Advantages of Window Reuse

- **Maintain Window Position**: Window won't reposition to screen center
- **Maintain Window Size**: If new config doesn't specify size, keeps original size
- **Reduce Flickering**: Avoids window close and recreate process
- **Improve Performance**: Reduces resource consumption and initialization time
- **Better User Experience**: Maintains continuous window state

## HTML Mode Usage

### Basic Usage

```javascript
// Call render-gui tool via MCP
{
  "title": "HTML Interface Example",
  "width": 800,
  "height": 600,
  "type": "html",
  "content": `
    <div style="padding: 20px;">
      <h1>Hello World</h1>
      <p>This is an HTML interface</p>
      <button onclick="alert('Button clicked')">Click Me</button>
    </div>
  `
}
```

### HTML to Markdown Feature Usage

### Automatic Conversion and Caching

When using the `render-gui` tool to render HTML interfaces, the system automatically:
1. Converts HTML content to high-quality Markdown format
2. Saves Markdown files to system temporary directory
3. Records Markdown file information in global cache

### Get Markdown File Path

```javascript
// Use get-gui tool to get only Markdown file path (fast)
{
  "markdownOnly": true
}

// Return result:
// ✅ Markdown file path
// 📁 File path: /tmp/nexusgui-cache/interface-title-2025-08-03T14-51-39-788Z.md
// 📁 Latest file: /tmp/nexusgui-cache/interface-title-latest.md
// 📄 File size: 1232 bytes
// ⏰ Created time: 2025/8/3 14:51:39
```

### Show File in File Manager

```javascript
// Use show-in-file-manager tool to show Markdown file in file manager
{
  "filePath": "/tmp/nexusgui-cache/interface-title-2025-08-03T14-51-39-788Z.md"
}

// Return result:
// ✅ File shown in file manager:
// 📁 /tmp/nexusgui-cache/interface-title-2025-08-03T14-51-39-788Z.md
```

### Read Markdown Content

```javascript
// Read and return Markdown file content
{
  "returnType": "markdown",
  "readMarkdown": true
}

// Returns complete Markdown text content (if content is long, shows preview of first 1000 characters)
```

### Get Both HTML and Markdown

```javascript
// Return both HTML and Markdown content
{
  "returnType": "both",
  "showHtml": true,
  "readMarkdown": true
}
```

### Get Cache Summary Information

```javascript
// Get summary including Markdown information
{
  "format": "summary",
  "returnType": "both"
}

// Return result includes:
// - HTML length and preview
// - Markdown length and file information
// - Cache time and other metadata
```

### Markdown Conversion Features

- **High-Quality Conversion**: Uses `turndown` library for professional HTML to Markdown conversion
- **Smart Cleanup**: Automatically removes styles, scripts, and other unnecessary HTML content
- **Format Preservation**: Maintains structure like headings, lists, tables, code blocks, links, quotes
- **File Management**: Automatically creates timestamped filenames and latest file links
- **System Integration**: Saves to standard system temporary directory with cross-platform support

### File Storage Structure

```
System Temp Directory/nexusgui-cache/
├── test-interface-2025-08-03T14-51-39-788Z.md
├── test-interface-latest.md -> test-interface-2025-08-03T14-51-39-788Z.md
├── user-form-2025-08-03T15-20-15-456Z.md
└── user-form-latest.md -> user-form-2025-08-03T15-20-15-456Z.md
```

### Use Cases

- **Document Generation**: Convert dynamic HTML interfaces to editable Markdown documents
- **Version Control**: Easy to include interface content in version control systems
- **AI Processing**: Markdown format is more suitable for AI model understanding and processing
- **Cross-Platform Compatibility**: Markdown has good support across various tools and platforms
- **Content Backup**: Automatically backup interface content in readable format

### Synchronous Result Waiting

```javascript
{
  "title": "User Confirmation Dialog",
  "width": 400,
  "height": 300,
  "waitForResult": true,  // Synchronously wait for result
  "type": "html",
  "content": `
    <div style="padding: 20px; text-align: center;">
      <h2>Confirm Operation</h2>
      <p>Are you sure you want to perform this operation?</p>
      <button onclick="electronAPI.sendResult({action: 'confirm', result: true})">
        Confirm
      </button>
      <button onclick="electronAPI.sendResult({action: 'cancel', result: false})">
        Cancel
      </button>
    </div>
  `
}
```

### Window Reuse Feature

```javascript
{
  "title": "Window Reuse Example",
  "reuseWindow": true,  // Reuse existing window
  "type": "html",
  "content": `
    <div style="padding: 20px;">
      <h1>Window Updated</h1>
      <p>This content replaced the previous window content</p>
    </div>
  `
}
```

### Advanced Features

```javascript
{
  "title": "Complex HTML Interface",
  "width": 600,
  "height": 500,
  "data": {
    "userName": "John Doe",
    "userAge": 25
  },
  "type": "html",
  "content": `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333;">User Information Form</h1>
      
      <form id="userForm">
        <div style="margin-bottom: 15px;">
          <label>Name:</label>
          <input type="text" name="userName" value="{{userName}}" style="width: 200px; padding: 5px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label>Age:</label>
          <input type="number" name="userAge" value="{{userAge}}" style="width: 200px; padding: 5px;">
        </div>
        <button type="button" onclick="handleSubmit()">Submit</button>
      </form>
      
      <div id="result"></div>
    </div>
  `,
  "callbacks": {
    "handleSubmit": `
      const formData = getFormData('#userForm');
      electronAPI.sendResult({ action: 'submit', data: formData });
    `
  }
}
```

### Feature Highlights

- **Complete HTML Support**: Supports all HTML tags and attributes
- **CSS Styling**: Supports inline styles and external CSS
- **JavaScript Interaction**: Supports event handling and dynamic interaction
- **Synchronous Waiting**: Use `waitForResult` parameter to synchronously wait for user operation results
- **Window Reuse**: Use `reuseWindow` parameter to reuse existing windows
- **Data Binding**: Supports initial data injection and template variable replacement
- **Callback Functions**: Supports custom callback function injection
- **Built-in APIs**: Provides `electronAPI.sendResult()` and `getFormData()` functions

## Adding New Tools

### Step 1: Create Tool Class

```javascript
// src/mcp/sse/tools/MyCustomTool.js
const BaseToolHandler = require('./BaseToolHandler');

class MyCustomTool extends BaseToolHandler {
    constructor() {
        super('my-custom-tool', 'My custom tool description');
    }
    
    getSchema() {
        return {
            type: 'object',
            properties: {
                param1: {
                    type: 'string',
                    description: 'Parameter 1 description'
                }
            },
            required: ['param1']
        };
    }
    
    async execute(args) {
        // Validate parameters
        this.validate(args);
        
        // Execute tool logic
        const result = await this.doSomething(args.param1);
        
        // Return result
        return {
            content: [{
                type: 'text',
                text: `✅ Custom tool executed successfully: ${result}`
            }]
        };
    }
    
    async doSomething(param) {
        // Specific business logic
        return `Processed parameter: ${param}`;
    }
}

module.exports = MyCustomTool;
```

### Step 2: Register Tool

```javascript
// Add to initializeToolRegistry function in server.js
const MyCustomTool = require('./tools/MyCustomTool');

async function initializeToolRegistry() {
    if (!globalToolRegistry) {
        globalToolRegistry = new ToolRegistry();
        
        // Register all tools
        globalToolRegistry.register(new RenderGUITool());
        globalToolRegistry.register(new InjectJSTool());
        globalToolRegistry.register(new NotificationTool());
        globalToolRegistry.register(new MyCustomTool()); // New addition
        
        await globalToolRegistry.initialize();
    }
    
    return globalToolRegistry;
}
```

## Tech Stack

- **Electron**: Desktop application framework (v27.0.0)
- **Model Context Protocol (MCP)**: AI communication protocol (@modelcontextprotocol/sdk v0.4.0)
- **Express**: Web server framework (v4.18.2)
- **Server-Sent Events (SSE)**: Real-time communication transport layer
- **CORS**: Cross-origin resource sharing support
- **Zod**: Data validation and type safety
- **Jest**: Testing framework (v29.7.0)

## Core Features

- 🎨 **Dynamic Interface Rendering**: Supports both HTML string and file path rendering modes
- 🔄 **Window Reuse**: Intelligent window management, reduces resource consumption
- ⏱️ **Synchronous Waiting**: Supports synchronous waiting for user operation results
- 🎛️ **Rich Window Properties**: Supports transparency, always on top, fullscreen, and many other window settings
- 🌐 **Cross-origin Support**: Built-in CORS support for easy integration
- 🔍 **Real-time Debugging**: Provides health check and session debug endpoints
- 📱 **System Tray**: Supports background running and tray management
- 🏗️ **Modular Architecture**: Object-oriented tool system for better maintainability and extensibility

## Architecture Benefits

### ✅ Significantly Improved Maintainability
- **Code Separation**: Each tool is implemented independently, modifications don't affect each other
- **Clear Responsibilities**: Each class is responsible for only one specific function
- **Unified Interface**: All tools follow the same interface specification

### ✅ Enhanced Extensibility
- **Plugin Architecture**: New tools only need to inherit base class and register
- **Independent Schema**: Tool definitions separated from implementation
- **Hot-swapping Support**: Supports dynamic tool registration and deregistration

### ✅ Improved Testability
- **Unit Testing**: Each tool can be tested independently
- **Dependency Mocking**: Easy to mock external dependencies
- **Error Isolation**: Tool errors don't affect each other

### ✅ Better Code Reuse
- **Base Functionality**: Common logic implemented in base class
- **Utility Classes**: HTML processing utilities can be reused across multiple tools
- **Configuration Management**: Unified validation and processing logic

## Migration Guide

For detailed information about the refactoring and how to migrate or extend the system, please refer to:
- `src/mcp/sse/tools/README.md` - Detailed architecture documentation
- `src/mcp/sse/MIGRATION.md` - Complete migration guide and best practices
- `src/mcp/sse/tools/test.js` - Test examples and validation code

The refactored system has been thoroughly tested and is fully backward compatible with existing MCP clients!