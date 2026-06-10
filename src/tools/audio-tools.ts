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
     * Applies all input volumes concurrently and reports per-input failures
     * so a missing input name doesn't leave the mix silently half-applied.
     */
    async setAudioMood(params: { mood: AudioMood }): Promise<ToolResult> {
        const profile = AUDIO_MOOD_PROFILES[params.mood];
        if (!profile) {
            this.safetyGuard.logOperation('set_audio_mood', params, false);
            return { success: false, error: `Unknown mood: ${params.mood}` };
        }

        if (this.safetyGuard.isDryRun()) {
            this.safetyGuard.logOperation('set_audio_mood', params, true);
            return {
                success: true,
                data: { mood: params.mood, profile, dryRun: true },
            };
        }

        const targets: Array<{ inputName: string; volume: number }> = [
            { inputName: this.config.micInputName, volume: profile.mic },
            { inputName: this.config.bgmInputName, volume: profile.bgm },
            { inputName: this.config.gameInputName, volume: profile.game },
            { inputName: this.config.seInputName, volume: profile.se },
        ];

        const results = await Promise.allSettled(
            targets.map((t) => this.obsAdapter.setInputVolume(t.inputName, t.volume))
        );

        const applied: string[] = [];
        const failed: Array<{ inputName: string; error: string }> = [];
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                applied.push(targets[i].inputName);
            } else {
                const reason = result.reason;
                failed.push({
                    inputName: targets[i].inputName,
                    error: reason instanceof Error ? reason.message : String(reason),
                });
            }
        });

        if (failed.length > 0) {
            this.safetyGuard.logOperation('set_audio_mood', params, false);
            return {
                success: false,
                error: `Failed to set volume for: ${failed
                    .map((f) => `${f.inputName} (${f.error})`)
                    .join(', ')}`,
                data: { mood: params.mood, applied, failed },
            };
        }

        this.currentMood = params.mood;
        this.safetyGuard.logOperation('set_audio_mood', params, true);

        return {
            success: true,
            data: { mood: params.mood, profile },
        };
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
