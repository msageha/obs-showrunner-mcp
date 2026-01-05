/**
 * MCP Server for OBS ShowRunner
 * Main server entry point with tool and resource registration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { OBSAdapter } from './adapters/obs-adapter.js';
import { ShowStateManager } from './core/show-state.js';
import { SafetyGuard } from './safety/safety-guard.js';
import {
    ShowTools,
    startShowSchema,
    endShowSchema,
    switchSegmentSchema,
    extendSegmentSchema,
} from './tools/show-tools.js';
import { AudioTools } from './tools/audio-tools.js';
import { EffectTools } from './tools/effect-tools.js';
import { VisionTools } from './tools/vision-tools.js';
import { ContentTools } from './tools/content-tools.js';
import { SceneTools } from './tools/scene-tools.js';
import type { OBSConnectionConfig, SafetyMode } from './types/index.js';

export interface ServerConfig {
    obs: OBSConnectionConfig;
    safety?: {
        mode?: SafetyMode;
        allowStopStreaming?: boolean;
        allowStopRecording?: boolean;
    };
    audio?: {
        micInputName: string;
        bgmInputName: string;
        gameInputName: string;
        seInputName: string;
    };
}

/**
 * Create and configure the MCP server
 */
export function createServer(config: ServerConfig) {
    const server = new Server(
        {
            name: 'obs-showrunner-mcp',
            version: '0.1.0',
        },
        {
            capabilities: {
                tools: {},
                resources: {},
            },
        }
    );

    // Initialize components
    const obsAdapter = new OBSAdapter();
    const showState = new ShowStateManager();
    const safetyGuard = new SafetyGuard();

    // Apply safety config
    if (config.safety?.mode) {
        safetyGuard.setMode(config.safety.mode);
    }
    if (config.safety) {
        safetyGuard.configure({
            mode: config.safety.mode ?? 'strict',
            allowStopStreaming: config.safety.allowStopStreaming ?? false,
            allowStopRecording: config.safety.allowStopRecording ?? false,
        });
    }

    // Tools
    const showTools = new ShowTools(showState, obsAdapter, safetyGuard);
    const audioTools = new AudioTools(obsAdapter, safetyGuard, config.audio ?? {
        micInputName: 'Mic/Aux',
        bgmInputName: 'BGM',
        gameInputName: 'Game Audio',
        seInputName: 'Sound Effects',
    });
    const effectTools = new EffectTools(obsAdapter, showState, safetyGuard);
    const visionTools = new VisionTools(obsAdapter, safetyGuard);
    const contentTools = new ContentTools(obsAdapter, safetyGuard);
    const sceneTools = new SceneTools(obsAdapter, safetyGuard);

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: 'start_show',
                description:
                    'Start a show and execute opening sequence. Loads show template and initializes state.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        show_template_id: {
                            type: 'string',
                            description: 'ID of the show template to use (default if not specified)',
                        },
                        options: {
                            type: 'object',
                            properties: {
                                skip_opening: {
                                    type: 'boolean',
                                    description: 'Skip the opening segment',
                                },
                                start_segment_id: {
                                    type: 'string',
                                    description: 'Start at a specific segment',
                                },
                            },
                        },
                    },
                },
            },
            {
                name: 'end_show',
                description:
                    'End the current show. Optionally play ending sequence and stop streaming/recording.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        options: {
                            type: 'object',
                            properties: {
                                play_ending: {
                                    type: 'boolean',
                                    description: 'Play the ending segment before ending',
                                },
                                stop_streaming: {
                                    type: 'boolean',
                                    description: 'Stop streaming (requires safety permission)',
                                },
                                stop_recording: {
                                    type: 'boolean',
                                    description: 'Stop recording (requires safety permission)',
                                },
                            },
                        },
                    },
                },
            },
            {
                name: 'switch_segment',
                description: 'Switch to a different segment of the show.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        segment_id: {
                            type: 'string',
                            description: 'ID of the segment to switch to',
                        },
                        options: {
                            type: 'object',
                            properties: {
                                smooth_transition: {
                                    type: 'boolean',
                                    description: 'Use smooth transition effect',
                                },
                                transition_duration_ms: {
                                    type: 'number',
                                    description: 'Transition duration in milliseconds',
                                },
                            },
                        },
                    },
                    required: ['segment_id'],
                },
            },
            {
                name: 'extend_segment',
                description: "Extend the current segment's timer.",
                inputSchema: {
                    type: 'object',
                    properties: {
                        minutes: {
                            type: 'number',
                            description: 'Minutes to extend (1-120)',
                        },
                    },
                    required: ['minutes'],
                },
            },
            {
                name: 'get_current_show_state',
                description: 'Get the current show state including segments, overlays, and timers.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_obs_health',
                description: 'Get OBS connection status and health metrics.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'set_safety_mode',
                description: 'Set the safety mode (strict, normal, debug).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        mode: {
                            type: 'string',
                            enum: ['strict', 'normal', 'debug'],
                            description: 'Safety mode to set',
                        },
                    },
                    required: ['mode'],
                },
            },
            {
                name: 'get_debug_config',
                description: 'Get masked configuration for debugging connection issues.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'reconnect_obs',
                description: 'Try to reconnect to OBS WebSocket using current configuration.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'set_audio_mood',
                description: 'Set the audio mood profile.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        mood: {
                            type: 'string',
                            enum: ['talk', 'game_focus', 'hype', 'cinema', 'celebration', 'mute_all'],
                            description: 'Audio mood to apply',
                        },
                    },
                    required: ['mood'],
                },
            },
            {
                name: 'trigger_effect',
                description: 'Trigger a visual effect.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        effectType: { type: 'string' },
                        intensity: { type: 'number' },
                        durationSec: { type: 'number' },
                    },
                    required: ['effectType'],
                },
            },
            {
                name: 'show_overlay',
                description: 'Show an overlay.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        overlayId: { type: 'string' },
                        params: { type: 'object' },
                    },
                    required: ['overlayId'],
                },
            },
            {
                name: 'hide_overlay',
                description: 'Hide an overlay.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        overlayId: { type: 'string' },
                    },
                    required: ['overlayId'],
                },
            },
            {
                name: 'take_stream_snapshot',
                description: 'Take a snapshot of the current stream.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourceName: { type: 'string' },
                    },
                },
            },
            {
                name: 'update_source_content',
                description: 'Update the content of an OBS source.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourceName: { type: 'string' },
                        content: { type: 'string' },
                        sourceType: { type: 'string', enum: ['text', 'browser', 'image'] },
                    },
                    required: ['sourceName', 'content'],
                },
            },
            {
                name: 'mark_highlight',
                description: 'Mark a highlight point in the stream.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                    },
                },
            },
            {
                name: 'get_scene_list',
                description: 'Get list of available scenes.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'set_scene',
                description: 'Switch the current program scene.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sceneName: { type: 'string' },
                    },
                    required: ['sceneName'],
                },
            },
        ],
    }));

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'get_debug_config': {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(
                                    {
                                        url: config.obs.websocketUrl,
                                        passwordSet: !!config.obs.password,
                                        passwordLength: config.obs.password?.length ?? 0,
                                        cwd: process.cwd(),
                                        nodeVersion: process.version,
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }

                case 'reconnect_obs': {
                    try {
                        await obsAdapter.disconnect();
                    } catch {
                        // Ignore disconnect errors
                    }
                    await obsAdapter.connect(config.obs.websocketUrl, config.obs.password);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ success: true, message: 'Reconnected to OBS' }),
                            },
                        ],
                    };
                }

                case 'start_show': {
                    const params = startShowSchema.parse(args);
                    const result = await showTools.startShow({
                        showTemplateId: params.show_template_id,
                        options: {
                            skipOpening: params.options?.skip_opening,
                            startSegmentId: params.options?.start_segment_id,
                        },
                    });
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'end_show': {
                    const params = endShowSchema.parse(args);
                    const result = await showTools.endShow({
                        options: {
                            playEnding: params.options?.play_ending,
                            stopStreaming: params.options?.stop_streaming,
                            stopRecording: params.options?.stop_recording,
                        },
                    });
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'switch_segment': {
                    const params = switchSegmentSchema.parse(args);
                    const result = await showTools.switchSegment({
                        segmentId: params.segment_id,
                        options: {
                            smoothTransition: params.options?.smooth_transition,
                            transitionDurationMs: params.options?.transition_duration_ms,
                        },
                    });
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'extend_segment': {
                    const params = extendSegmentSchema.parse(args);
                    const result = await showTools.extendSegment({
                        minutes: params.minutes,
                    });
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'get_current_show_state': {
                    const result = showTools.getCurrentShowState();
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'get_obs_health': {
                    const connected = obsAdapter.isConnected();
                    let version = null;
                    let stats = null;

                    if (connected) {
                        try {
                            version = await obsAdapter.getVersion();
                            stats = await obsAdapter.getStats();
                        } catch {
                            // Ignore errors when getting stats
                        }
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(
                                    {
                                        connected,
                                        obsVersion: version?.obsVersion ?? null,
                                        cpuUsage: stats?.cpuUsage ?? null,
                                        fps: stats?.activeFps ?? null,
                                        droppedFrames: stats?.outputSkippedFrames ?? null,
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }

                case 'set_safety_mode': {
                    const params = z.object({ mode: z.enum(['strict', 'normal', 'debug']) }).parse(args);
                    safetyGuard.setMode(params.mode);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ success: true, mode: params.mode }),
                            },
                        ],
                    };
                }

                case 'set_audio_mood': {
                    const params = z.object({ mood: z.string() }).parse(args);
                    const result = await audioTools.setAudioMood({
                        mood: params.mood as any,
                    });
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'trigger_effect': {
                    const params = z.object({
                        effectType: z.string(),
                        intensity: z.number().optional(),
                        durationSec: z.number().optional(),
                    }).parse(args);
                    const result = await effectTools.triggerEffect(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'show_overlay': {
                    const params = z.object({
                        overlayId: z.string(),
                        params: z.record(z.any()).optional(),
                    }).parse(args);
                    const result = await effectTools.showOverlay(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'hide_overlay': {
                    const params = z.object({ overlayId: z.string() }).parse(args);
                    const result = await effectTools.hideOverlay(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'take_stream_snapshot': {
                    const params = z.object({ sourceName: z.string().optional() }).parse(args);
                    const result = await visionTools.takeStreamSnapshot(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'update_source_content': {
                    const params = z.object({
                        sourceName: z.string(),
                        content: z.string(),
                        sourceType: z.enum(['text', 'browser', 'image']).optional(),
                    }).parse(args);
                    const result = await contentTools.updateSourceContent(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'mark_highlight': {
                    const params = z.object({ description: z.string().optional() }).parse(args);
                    const result = await effectTools.markHighlight(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'get_scene_list': {
                    const result = await sceneTools.getSceneList();
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                case 'set_scene': {
                    const params = z.object({ sceneName: z.string() }).parse(args);
                    const result = await sceneTools.setScene(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ success: false, error: message }),
                    },
                ],
                isError: true,
            };
        }
    });

    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            {
                uri: 'obs://state/current',
                name: 'Current Show State',
                description: 'Current show state including segment, overlays, and timers',
                mimeType: 'application/json',
            },
        ],
    }));

    // Read resources
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params;

        if (uri === 'obs://state/current') {
            const state = showState.getCurrentState();
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(state, null, 2),
                    },
                ],
            };
        }

        throw new Error(`Unknown resource: ${uri}`);
    });

    return {
        server,
        obsAdapter,
        showState,
        safetyGuard,
        showTools,
        sceneTools,
        async connect() {
            await obsAdapter.connect(config.obs.websocketUrl, config.obs.password);
        },
        async start() {
            const transport = new StdioServerTransport();
            await server.connect(transport);
        },
    };
}
