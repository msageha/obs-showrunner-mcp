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
    }): Promise<ToolResult> {
        try {
            const format = params.imageFormat ?? 'png';
            const imageData = await this.obsAdapter.getSourceScreenshot(
                params.sourceName,
                format
            );

            this.safetyGuard.logOperation('take_stream_snapshot', params, true);

            return {
                success: true,
                data: { imageData },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('take_stream_snapshot', params, false);
            return { success: false, error: message };
        }
    }
}
