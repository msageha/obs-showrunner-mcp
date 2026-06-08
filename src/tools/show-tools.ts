/**
 * Show Tools - MCP Tools for show control
 */

import { z } from 'zod';
import type { ShowStateManager } from '../core/show-state.js';
import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { SafetyGuard } from '../safety/safety-guard.js';
import type { ShowState } from '../types/index.js';

/**
 * Tool result type
 */
export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

/**
 * Show Tools class containing all show-related MCP tools
 */
export class ShowTools {
    constructor(
        private showState: ShowStateManager,
        private obsAdapter: OBSAdapter,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * start_show tool
     */
    async startShow(params: {
        showTemplateId?: string;
        options?: {
            skipOpening?: boolean;
            startSegmentId?: string;
        };
    }): Promise<ToolResult> {
        try {
            const templateId = params.showTemplateId ?? 'default';
            const state = this.showState.startShow(templateId, {
                skipOpening: params.options?.skipOpening,
                startSegmentId: params.options?.startSegmentId,
            });

            // Switch to the segment's scene if defined
            if (state.currentSegment?.sceneName) {
                await this.obsAdapter.setCurrentScene(state.currentSegment.sceneName);
            }

            this.safetyGuard.logOperation('start_show', params, true);

            return {
                success: true,
                data: {
                    showId: state.showId,
                    currentSegment: state.currentSegment,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('start_show', params, false);
            return {
                success: false,
                error: message,
            };
        }
    }

    /**
     * end_show tool
     */
    async endShow(params: {
        options?: {
            playEnding?: boolean;
            stopStreaming?: boolean;
            stopRecording?: boolean;
        };
    }): Promise<ToolResult> {
        try {
            // Check safety for dangerous operations
            if (params.options?.stopStreaming) {
                const validation = this.safetyGuard.validateOperation('stop_streaming');
                if (!validation.allowed) {
                    return { success: false, error: validation.reason };
                }
            }

            if (params.options?.stopRecording) {
                const validation = this.safetyGuard.validateOperation('stop_recording');
                if (!validation.allowed) {
                    return { success: false, error: validation.reason };
                }
            }

            // Play ending segment if requested
            if (params.options?.playEnding) {
                const segments = this.showState.getSegmentList();
                const endingSegment = segments.find((s) => s.type === 'ending');
                if (endingSegment) {
                    this.showState.switchSegment(endingSegment.id);
                    if (endingSegment.defaultSceneName) {
                        await this.obsAdapter.setCurrentScene(endingSegment.defaultSceneName);
                    }
                }
            }

            // Stop outputs if requested (already validated above)
            if (params.options?.stopStreaming) {
                await this.obsAdapter.stopStream();
            }
            if (params.options?.stopRecording) {
                await this.obsAdapter.stopRecord();
            }

            this.showState.endShow();
            this.safetyGuard.logOperation('end_show', params, true);

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('end_show', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * switch_segment tool
     */
    async switchSegment(params: {
        segmentId: string;
        options?: {
            smoothTransition?: boolean;
            transitionDurationMs?: number;
        };
    }): Promise<ToolResult> {
        try {
            const state = this.showState.switchSegment(params.segmentId);

            // Switch to the segment's scene if defined
            if (state.currentSegment?.sceneName) {
                await this.obsAdapter.setCurrentScene(state.currentSegment.sceneName);
            }

            this.safetyGuard.logOperation('switch_segment', params, true);

            return {
                success: true,
                data: {
                    currentSegment: state.currentSegment,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('switch_segment', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * extend_segment tool
     */
    async extendSegment(params: { minutes: number }): Promise<ToolResult> {
        try {
            const state = this.showState.extendSegment(params.minutes);
            this.safetyGuard.logOperation('extend_segment', params, true);

            return {
                success: true,
                data: {
                    timerRemainingSec: state.currentSegment?.timerRemainingSec,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('extend_segment', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * get_current_show_state tool
     */
    getCurrentShowState(): ToolResult {
        const state = this.showState.getCurrentState();
        return {
            success: true,
            data: {
                showId: state.showId,
                showName: state.showName,
                currentSegment: state.currentSegment,
                segments: state.segments.map((s) => ({
                    id: s.id,
                    name: s.name,
                    type: s.type,
                })),
                overlays: state.overlays,
                timers: state.timers,
            },
        };
    }
}

/**
 * Zod schemas for tool parameters
 */
export const startShowSchema = z.object({
    show_template_id: z.string().optional(),
    options: z
        .object({
            skip_opening: z.boolean().optional(),
            start_segment_id: z.string().optional(),
        })
        .optional(),
});

export const endShowSchema = z.object({
    options: z
        .object({
            play_ending: z.boolean().optional(),
            stop_streaming: z.boolean().optional(),
            stop_recording: z.boolean().optional(),
        })
        .optional(),
});

export const switchSegmentSchema = z.object({
    segment_id: z.string(),
    options: z
        .object({
            smooth_transition: z.boolean().optional(),
            transition_duration_ms: z.number().optional(),
        })
        .optional(),
});

export const extendSegmentSchema = z.object({
    minutes: z.number().min(1).max(120),
});
