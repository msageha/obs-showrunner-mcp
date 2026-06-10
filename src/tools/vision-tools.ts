/**
 * Vision Tools - MCP Tools for visual inspection
 */

import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { SafetyGuard } from '../safety/safety-guard.js';

export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

// Defaults keep the base64 payload small enough for LLM context windows
// while remaining legible; full-resolution PNGs can easily reach several MB.
const DEFAULT_IMAGE_FORMAT = 'jpg';
const DEFAULT_IMAGE_WIDTH = 1280;
const DEFAULT_COMPRESSION_QUALITY = 75;

export class VisionTools {
    constructor(
        private obsAdapter: OBSAdapter,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * take_stream_snapshot tool
     */
    async takeStreamSnapshot(params: {
        sourceName?: string;
        imageFormat?: string;
        imageWidth?: number;
        imageCompressionQuality?: number;
    }): Promise<ToolResult> {
        try {
            // GetSourceScreenshot requires a source (name or uuid); when none is
            // given, capture the current program scene — i.e. what is actually
            // being output/streamed.
            let sourceName = params.sourceName;
            if (!sourceName) {
                const sceneList = await this.obsAdapter.getSceneList();
                sourceName = sceneList.currentProgramSceneName ?? undefined;
                if (!sourceName) {
                    this.safetyGuard.logOperation('take_stream_snapshot', params, false);
                    return {
                        success: false,
                        error: 'No sourceName provided and no active program scene to capture',
                    };
                }
            }

            const imageData = await this.obsAdapter.getSourceScreenshot(sourceName, {
                imageFormat: params.imageFormat ?? DEFAULT_IMAGE_FORMAT,
                imageWidth: params.imageWidth ?? DEFAULT_IMAGE_WIDTH,
                imageCompressionQuality:
                    params.imageCompressionQuality ?? DEFAULT_COMPRESSION_QUALITY,
            });

            this.safetyGuard.logOperation('take_stream_snapshot', params, true);

            return {
                success: true,
                data: { imageData, sourceName },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('take_stream_snapshot', params, false);
            return { success: false, error: message };
        }
    }
}
