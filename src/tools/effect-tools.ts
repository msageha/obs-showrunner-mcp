/**
 * Effect Tools - MCP Tools for visual effects, overlays, and highlights
 */

import { randomUUID } from 'crypto';
import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { ShowStateManager } from '../core/show-state.js';
import type { SafetyGuard } from '../safety/safety-guard.js';
import type { EffectType, Highlight } from '../types/index.js';

export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

export class EffectTools {
    private highlights: Highlight[] = [];

    constructor(
        private obsAdapter: OBSAdapter,
        private showState: ShowStateManager,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * trigger_effect tool
     */
    async triggerEffect(params: {
        effectType: EffectType;
        intensity?: number;
        durationSec?: number;
        autoRevert?: boolean;
        message?: string;
    }): Promise<ToolResult> {
        try {
            this.safetyGuard.logOperation('trigger_effect', params, true);

            return {
                success: true,
                data: {
                    effectType: params.effectType,
                    intensity: params.intensity ?? 0.5,
                    message: params.message,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('trigger_effect', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * show_overlay tool
     */
    async showOverlay(params: {
        overlayId: string;
        params?: Record<string, unknown>;
    }): Promise<ToolResult> {
        try {
            // Add overlay to state
            this.showState.addOverlay({
                id: params.overlayId,
                visible: true,
                params: params.params ?? {},
            });

            this.safetyGuard.logOperation('show_overlay', params, true);

            return {
                success: true,
                data: {
                    overlayId: params.overlayId,
                    visible: true,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('show_overlay', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * hide_overlay tool
     */
    async hideOverlay(params: { overlayId: string }): Promise<ToolResult> {
        try {
            this.showState.setOverlayVisible(params.overlayId, false);
            this.safetyGuard.logOperation('hide_overlay', params, true);

            return {
                success: true,
                data: { overlayId: params.overlayId, visible: false },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('hide_overlay', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * mark_highlight tool
     */
    async markHighlight(params: { description?: string }): Promise<ToolResult> {
        try {
            const highlight: Highlight = {
                id: randomUUID(),
                description: params.description,
                timestamp: Date.now(),
            };

            this.highlights.push(highlight);
            this.safetyGuard.logOperation('mark_highlight', params, true);

            return {
                success: true,
                data: {
                    highlightId: highlight.id,
                    timestamp: highlight.timestamp,
                    description: highlight.description,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('mark_highlight', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * Get all highlights
     */
    getHighlights(): Highlight[] {
        return [...this.highlights];
    }

    /**
     * Clear all highlights
     */
    clearHighlights(): void {
        this.highlights = [];
    }
}
