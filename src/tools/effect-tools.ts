/**
 * Effect Tools - MCP Tools for visual effects, overlays, and highlights
 *
 * Overlays and effects are mapped to OBS scene items by name: showing an
 * overlay enables the scene item with that name in the current program scene.
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

const DEFAULT_EFFECT_DURATION_SEC = 5;

export class EffectTools {
    private highlights: Highlight[] = [];

    constructor(
        private obsAdapter: OBSAdapter,
        private showState: ShowStateManager,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * Resolve the current program scene name, or throw if none is active.
     */
    private async getCurrentSceneName(): Promise<string> {
        const sceneList = await this.obsAdapter.getSceneList();
        const sceneName = sceneList.currentProgramSceneName;
        if (!sceneName) {
            throw new Error('No active program scene');
        }
        return sceneName;
    }

    /**
     * trigger_effect tool
     * Enables the scene item named after the effect type in the current
     * program scene, then disables it again after durationSec (auto-revert).
     */
    async triggerEffect(params: {
        effectType: EffectType;
        durationSec?: number;
        autoRevert?: boolean;
    }): Promise<ToolResult> {
        try {
            const durationSec = params.durationSec ?? DEFAULT_EFFECT_DURATION_SEC;
            const autoRevert = params.autoRevert ?? true;
            const dryRun = this.safetyGuard.isDryRun();

            let sceneName: string | undefined;
            if (!dryRun) {
                sceneName = await this.getCurrentSceneName();
                await this.obsAdapter.setSceneItemEnabled(
                    sceneName,
                    params.effectType,
                    true
                );

                if (autoRevert) {
                    const revertScene = sceneName;
                    const timer = setTimeout(() => {
                        this.obsAdapter
                            .setSceneItemEnabled(revertScene, params.effectType, false)
                            .catch((error: unknown) => {
                                console.error(
                                    `[obs-showrunner] Failed to revert effect '${params.effectType}':`,
                                    error instanceof Error ? error.message : error
                                );
                            });
                    }, durationSec * 1000);
                    timer.unref?.();
                }
            }

            this.safetyGuard.logOperation('trigger_effect', params, true);

            return {
                success: true,
                data: {
                    effectType: params.effectType,
                    sceneName,
                    durationSec,
                    autoRevert,
                    ...(dryRun ? { dryRun: true } : {}),
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
     * Enables the scene item named overlayId in the current program scene.
     */
    async showOverlay(params: {
        overlayId: string;
        params?: Record<string, unknown>;
    }): Promise<ToolResult> {
        try {
            const dryRun = this.safetyGuard.isDryRun();

            if (!dryRun) {
                const sceneName = await this.getCurrentSceneName();
                await this.obsAdapter.setSceneItemEnabled(
                    sceneName,
                    params.overlayId,
                    true
                );
            }

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
                    ...(dryRun ? { dryRun: true } : {}),
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
     * Disables the scene item named overlayId in the current program scene.
     */
    async hideOverlay(params: { overlayId: string }): Promise<ToolResult> {
        try {
            const dryRun = this.safetyGuard.isDryRun();

            if (!dryRun) {
                const sceneName = await this.getCurrentSceneName();
                await this.obsAdapter.setSceneItemEnabled(
                    sceneName,
                    params.overlayId,
                    false
                );
            }

            this.showState.setOverlayVisible(params.overlayId, false);
            this.safetyGuard.logOperation('hide_overlay', params, true);

            return {
                success: true,
                data: {
                    overlayId: params.overlayId,
                    visible: false,
                    ...(dryRun ? { dryRun: true } : {}),
                },
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
