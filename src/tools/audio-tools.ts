/**
 * Audio Tools - MCP Tools for audio control
 */

import type { OBSAdapter } from '../adapters/obs-adapter.js';
import type { SafetyGuard } from '../safety/safety-guard.js';
import type { AudioMood } from '../types/index.js';
import { AUDIO_MOOD_PROFILES } from '../types/index.js';

export interface AudioConfig {
    micInputName: string;
    bgmInputName: string;
    gameInputName: string;
    seInputName: string;
}

export interface ToolResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

export class AudioTools {
    private currentMood: AudioMood | null = null;

    constructor(
        private obsAdapter: OBSAdapter,
        private safetyGuard: SafetyGuard,
        private config: AudioConfig
    ) { }

    /**
     * set_audio_mood tool
     */
    async setAudioMood(params: {
        mood: AudioMood;
        fadeDurationMs?: number;
    }): Promise<ToolResult> {
        try {
            const profile = AUDIO_MOOD_PROFILES[params.mood];
            if (!profile) {
                return { success: false, error: `Unknown mood: ${params.mood}` };
            }

            // Apply volume settings
            await this.obsAdapter.setInputVolume(this.config.micInputName, profile.mic);
            await this.obsAdapter.setInputVolume(this.config.bgmInputName, profile.bgm);
            await this.obsAdapter.setInputVolume(this.config.gameInputName, profile.game);
            await this.obsAdapter.setInputVolume(this.config.seInputName, profile.se);

            this.currentMood = params.mood;
            this.safetyGuard.logOperation('set_audio_mood', params, true);

            return {
                success: true,
                data: { mood: params.mood, profile },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.safetyGuard.logOperation('set_audio_mood', params, false);
            return { success: false, error: message };
        }
    }

    /**
     * Get current audio mood
     */
    getCurrentMood(): AudioMood | null {
        return this.currentMood;
    }

    /**
     * Get list of available moods
     */
    getAvailableMoods(): AudioMood[] {
        return Object.keys(AUDIO_MOOD_PROFILES) as AudioMood[];
    }
}
