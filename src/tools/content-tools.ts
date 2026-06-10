/**
 * Content Tools - MCP Tools for dynamic content injection
 */

import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { SafetyGuard } from '../safety/safety-guard.js';

export type SourceType = 'text' | 'browser' | 'image';

export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

export class ContentTools {
    constructor(
        private obsAdapter: OBSAdapter,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * update_source_content tool
     */
    async updateSourceContent(params: {
        sourceName: string;
        content: string;
        sourceType?: SourceType;
        properties?: Record<string, unknown>;
    }): Promise<ToolResult> {
        try {
            const sourceType = params.sourceType ?? 'text';
            let settings: Record<string, unknown>;

            switch (sourceType) {
                case 'text':
                    settings = { text: params.content };
                    break;
                case 'browser':
                    settings = { url: params.content };
                    break;
                case 'image':
                    settings = { file: params.content };
                    break;
                default:
                    settings = { text: params.content };
            }

            // Merge additional properties
            if (params.properties) {
                settings = { ...settings, ...params.properties };
            }

            const dryRun = this.safetyGuard.isDryRun();
            if (!dryRun) {
                await this.obsAdapter.setInputSettings(params.sourceName, settings, true);
            }

            return {
                success: true,
                data: {
                    sourceName: params.sourceName,
                    sourceType,
                    content: params.content,
                    ...(dryRun ? { dryRun: true } : {}),
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    }
}
