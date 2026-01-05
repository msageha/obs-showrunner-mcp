# OBS ShowRunner MCP Server

**AI Director in the Loop** - MCP server enabling LLMs to control OBS Studio through high-level "show" and "effect" APIs.

[![npm version](https://img.shields.io/npm/v/obs-showrunner-mcp.svg)](https://www.npmjs.com/package/obs-showrunner-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

OBS ShowRunner transforms your LLM (Claude, ChatGPT, etc.) into an AI Director that can:

- 🎬 **Control show flow** - Start/end shows, switch segments with pre-configured scenes
- 🎨 **Trigger effects** - Visual effects, overlays, and celebratory animations
- 🎵 **Manage audio** - Switch between mood-based audio profiles (talk, hype, cinema)
- 📷 **See the stream** - Take screenshots for visual decision-making
- ✏️ **Update content** - Dynamically change text, browser sources, and images
- 🔒 **Safe by default** - Dangerous operations are blocked in strict mode

## Quick Start

### Prerequisites

- OBS Studio 31+ with WebSocket enabled (default port: 4455)
- Node.js 18+

### Installation

```bash
# Install globally via npm
npm install -g obs-showrunner-mcp

# Or use npx directly (no installation required)
npx obs-showrunner-mcp
```

### Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obs-showrunner": {
      "command": "npx",
      "args": ["-y", "obs-showrunner-mcp"],
      "env": {
        "OBS_WEBSOCKET_URL": "ws://localhost:4455",
        "OBS_WEBSOCKET_PASSWORD": "your_password"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "obs-showrunner": {
      "command": "obs-showrunner-mcp",
      "env": {
        "OBS_WEBSOCKET_URL": "ws://localhost:4455",
        "OBS_WEBSOCKET_PASSWORD": "your_password"
      }
    }
  }
}
```

### Usage

Once configured, you can ask Claude things like:

- "Start the show and switch to the gaming segment"
- "Take a screenshot of the current stream"
- "Switch audio to hype mode"
- "Show the title overlay with text 'Welcome!'"
- "Mark this moment as a highlight"

## Available Tools

### Scene Control

| Tool | Description |
|------|-------------|
| `get_scene_list` | Get list of available scenes |
| `set_scene` | Switch to a specific scene |

### Show Control

| Tool | Description |
|------|-------------|
| `start_show` | Start a show from a template |
| `end_show` | End the current show |
| `switch_segment` | Switch to a different segment |
| `extend_segment` | Extend current segment timer |
| `get_current_show_state` | Get current show state |

### Audio & Effects

| Tool | Description |
|------|-------------|
| `set_audio_mood` | Apply audio mood profile (talk, hype, cinema, etc.) |
| `trigger_effect` | Trigger visual effects |
| `show_overlay` | Show an overlay |
| `hide_overlay` | Hide an overlay |
| `mark_highlight` | Mark a highlight timestamp |

### Vision & Content

| Tool | Description |
|------|-------------|
| `take_stream_snapshot` | Capture screenshot (Vision) |
| `update_source_content` | Update text/browser/image sources |

### Admin

| Tool | Description |
|------|-------------|
| `get_obs_health` | Check OBS connection status |
| `reconnect_obs` | Reconnect to OBS WebSocket |
| `set_safety_mode` | Change safety mode |
| `get_debug_config` | Get debug configuration |

## Resources

| URI | Description |
|-----|-------------|
| `obs://state/current` | Current show state (JSON) |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OBS_WEBSOCKET_URL` | `ws://localhost:4455` | OBS WebSocket URL |
| `OBS_WEBSOCKET_PASSWORD` | - | OBS WebSocket password |
| `SAFETY_MODE` | `strict` | Safety mode (strict/normal/debug) |
| `ALLOW_STOP_STREAMING` | `false` | Allow stopping stream |
| `ALLOW_STOP_RECORDING` | `false` | Allow stopping recording |
| `OBS_MIC_INPUT_NAME` | `Mic/Aux` | Microphone source name |
| `OBS_BGM_INPUT_NAME` | `BGM` | BGM source name |
| `OBS_GAME_INPUT_NAME` | `Game Audio` | Game audio source name |
| `OBS_SE_INPUT_NAME` | `Sound Effects` | Sound effects source name |

## Development

```bash
# Clone the repository
git clone https://github.com/takurot/obs-showrunner-mcp.git
cd obs-showrunner-mcp

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Development mode
npm run dev

# Build
npm run build
```

## Safety Modes

- **strict** (default): Blocks all dangerous operations
- **normal**: Allows configured operations only
- **debug**: Dry-run mode, operations are logged but not executed

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Claude    │────▶│  MCP Server           │────▶│  OBS Studio │
│   Desktop   │◀────│  (obs-showrunner-mcp) │◀────│  WebSocket  │
└─────────────┘     └──────────────────────┘     └─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼─────┐     ┌───────▼───────┐
              │   Show    │     │   Safety      │
              │   State   │     │   Guard       │
              └───────────┘     └───────────────┘
```

## License

MIT
