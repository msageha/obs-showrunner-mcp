/**
 * Scene Tools - MCP Tools for scene control
 */

import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { SafetyGuard } from '../safety/safety-guard.js';

export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

export class SceneTools {
    constructor(
        private obsAdapter: OBSAdapter,
        private safetyGuard: SafetyGuard
    ) { }

    /**
     * get_scene_list tool
     */
    async getSceneList(): Promise<ToolResult> {
        try {
            const scenes = await this.obsAdapter.getSceneList();
            return {
                success: true,
                data: { ...scenes },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    }

    /**
     * set_scene tool
     */
    async setScene(params: {
        sceneName: string;
    }): Promise<ToolResult> {
        try {
            const dryRun = this.safetyGuard.isDryRun();
            if (!dryRun) {
                await this.obsAdapter.setCurrentScene(params.sceneName);
            }
            this.safetyGuard.logOperation('set_scene', params, true);
            return {
                success: true,
                data: {
                    sceneName: params.sceneName,
                    ...(dryRun ? { dryRun: true } : {}),
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('set_scene', params, false);
            return { success: false, error: message };
        }
    }
}
