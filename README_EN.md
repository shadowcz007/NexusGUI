# NexusGUI

English | [中文](./README.md)

AI-generated GUI interfaces through MCP protocol with desktop rendering

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
After startup, the application will start an MCP server at `http://localhost:3001`. You can use it as follows:

1. **Connect to MCP Server**: `http://localhost:3001/mcp`
2. **Call render-gui tool**:
```javascript
{
  "title": "My First Interface",
  "width": 600,
  "height": 400,
  "html": "<div style='padding: 20px; text-align: center;'><h1>Hello NexusGUI!</h1><p>This is my first dynamic interface</p></div>"
}
```

## 🆕 Latest Features

### System Tray Integration 🆕
- ✅ Support system tray mode without keeping main window open
- ✅ Right-click tray icon to access MCP server console and debug features
- ✅ Real-time display of server status, port, and active session information
- ✅ Integrated health check, debug info, session management tools
- ✅ Support server settings and configuration management
- ✅ Cross-platform support (macOS, Windows, Linux)

### Direct HTML Rendering Mode 🆕
- ✅ Support direct HTML string input for interface rendering
- ✅ Support HTML file path rendering (HTML strings take priority)
- ✅ Fully customizable interface layout and styling
- ✅ Support JavaScript event handling and interaction
- ✅ Built-in `electronAPI.sendResult()` function for synchronous result waiting

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
│       │   ├── server.js  # SSE MCP server
│       │   ├── wrapper.js # SSE server wrapper
│       │   └── transport.js # SSE transport layer
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

## File Description

### Core Files
- **`src/main/main.js`**: Electron main process, responsible for window management and MCP server integration
- **`src/main/preload.js`**: Preload script providing secure IPC communication interface
- **`src/renderer/renderer.js`**: Dynamic interface renderer that receives GUI definitions and creates interfaces
- **`src/renderer/index.html`**: Main interface HTML template
- **`src/renderer/styles.css`**: Interface style files

### MCP Server
- **`src/mcp/sse/server.js`**: SSE transport MCP server (primary)
- **`src/mcp/sse/wrapper.js`**: SSE server wrapper
- **`src/mcp/sse/transport.js`**: SSE transport layer implementation
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
After startup, the MCP server will provide services at the following endpoints:
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
    { "type": "text", "text": "This window reused the previous window" },
    { "type": "button", "text": "Click Me", "onClick": "handleClick" }
  ],
  "callbacks": {
    "handleClick": "alert('Reused window button clicked!');"
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
- **Maintain Window Size**: Keep original size if new config doesn't specify dimensions
- **Reduce Flickering**: Avoid window closing and recreation process
- **Improve Performance**: Reduce resource consumption and initialization time
- **Better User Experience**: Maintain continuous window state

## HTML Mode Usage

### Basic Usage

```javascript
// Call render-gui tool via MCP
{
  "title": "HTML Interface Example",
  "width": 800,
  "height": 600,
  "html": `
    <div style="padding: 20px;">
      <h1>Hello World</h1>
      <p>This is an HTML interface</p>
      <button onclick="alert('Button clicked')">Click Me</button>
    </div>
  `
}
```

### Synchronous Result Waiting

```javascript
{
  "title": "User Confirmation Dialog",
  "width": 400,
  "height": 300,
  "waitForResult": true,  // Wait for result synchronously
  "html": `
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
  "html": `
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
  "html": `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333;">User Information Form</h1>
      
      <form id="userForm">
        <div style="margin-bottom: 15px;">
          <label>Name: </label>
          <input type="text" name="userName" value="{{userName}}" style="width: 200px; padding: 5px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label>Age: </label>
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

- **Complete HTML Support**: Support all HTML tags and attributes
- **CSS Styling**: Support inline styles and external CSS
- **JavaScript Interaction**: Support event handling and dynamic interaction
- **Synchronous Waiting**: Synchronously wait for user operation results via `waitForResult` parameter
- **Window Reuse**: Reuse existing windows via `reuseWindow` parameter
- **Data Binding**: Support initial data injection and template variable replacement
- **Callback Functions**: Support custom callback function injection
- **Built-in APIs**: Provide `electronAPI.sendResult()` and `getFormData()` functions

## Technology Stack

- **Electron**: Desktop application framework (v27.0.0)
- **Model Context Protocol (MCP)**: AI communication protocol (@modelcontextprotocol/sdk v0.4.0)
- **Express**: Web server framework (v4.18.2)
- **Server-Sent Events (SSE)**: Real-time communication transport layer
- **CORS**: Cross-Origin Resource Sharing support
- **Zod**: Data validation and type safety
- **Jest**: Testing framework (v29.7.0)

## Core Features

- 🎨 **Dynamic Interface Rendering**: Support both HTML string and file path rendering modes
- 🔄 **Window Reuse**: Intelligent window management to reduce resource consumption
- ⏱️ **Synchronous Waiting**: Support synchronous waiting for user operation results
- 🎛️ **Rich Window Properties**: Support transparency, always on top, fullscreen and other window settings
- 🌐 **Cross-Origin Support**: Built-in CORS support for easy integration
- 🔍 **Real-time Debugging**: Provide health check and session debug endpoints
- 📱 **System Tray**: Support background running and tray management