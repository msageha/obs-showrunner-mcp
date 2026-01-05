#!/usr/bin/env node
/**
 * OBS ShowRunner MCP Server - Entry Point
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from './server.js';

// Redirect console.log/info/debug to stderr to prevent breaking MCP JSON-RPC on stdout
const originalLog = console.log;
const originalInfo = console.info;
const originalDebug = console.debug;

console.log = console.error;
console.info = console.error;
console.debug = console.error;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env from project root explicitly and force override
// Note: debug:false is critical - any stdout output breaks MCP JSON-RPC protocol
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath, override: true, debug: false });

async function main() {
    const config = {
        obs: {
            websocketUrl: process.env.OBS_WEBSOCKET_URL ?? 'ws://localhost:4455',
            password: process.env.OBS_WEBSOCKET_PASSWORD,
        },
        safety: {
            mode: (process.env.SAFETY_MODE ?? 'strict') as 'strict' | 'normal' | 'debug',
            allowStopStreaming: process.env.ALLOW_STOP_STREAMING === 'true',
            allowStopRecording: process.env.ALLOW_STOP_RECORDING === 'true',
        },
        audio: {
            micInputName: process.env.OBS_MIC_INPUT_NAME ?? 'Mic/Aux',
            bgmInputName: process.env.OBS_BGM_INPUT_NAME ?? 'BGM',
            gameInputName: process.env.OBS_GAME_INPUT_NAME ?? 'Game Audio',
            seInputName: process.env.OBS_SE_INPUT_NAME ?? 'Sound Effects',
        },
    };

    const { start } = createServer(config);

    // Start the MCP server
    await start();
}

main().catch(() => {
    process.exit(1);
});
