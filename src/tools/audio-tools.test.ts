/**
 * Audio Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioTools } from './audio-tools.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { SafetyGuard } from '../safety/safety-guard.js';
import { AUDIO_MOOD_PROFILES } from '../types/index.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            setInputVolume: vi.fn().mockResolvedValue(undefined),
            setInputMute: vi.fn().mockResolvedValue(undefined),
            isConnected: vi.fn().mockReturnValue(true),
        })),
    };
});

describe('AudioTools', () => {
    let audioTools: AudioTools;
    let obsAdapter: OBSAdapter;
    let safetyGuard: SafetyGuard;

    beforeEach(() => {
        obsAdapter = new OBSAdapter();
        safetyGuard = new SafetyGuard();
        audioTools = new AudioTools(obsAdapter, safetyGuard, {
            micInputName: 'Mic/Aux',
            bgmInputName: 'BGM',
            gameInputName: 'Game Audio',
            seInputName: 'Sound Effects',
        });
    });

    describe('setAudioMood', () => {
        it('should apply talk mood profile', async () => {
            const result = await audioTools.setAudioMood({ mood: 'talk' });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('Mic/Aux', 1.0);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('BGM', 0.3);
        });

        it('should apply hype mood profile', async () => {
            const result = await audioTools.setAudioMood({ mood: 'hype' });

            expect(result.success).toBe(true);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('Mic/Aux', 1.0);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('BGM', 0.8);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('Game Audio', 0.6);
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('Sound Effects', 1.0);
        });

        it('should apply mute_all mood by muting all inputs', async () => {
            const result = await audioTools.setAudioMood({ mood: 'mute_all' });

            expect(result.success).toBe(true);
            // mute_all sets volumes to 0
            expect(obsAdapter.setInputVolume).toHaveBeenCalledWith('Mic/Aux', 0);
        });

        it('should return current mood after setting', async () => {
            await audioTools.setAudioMood({ mood: 'cinema' });
            const currentMood = audioTools.getCurrentMood();

            expect(currentMood).toBe('cinema');
        });
    });

    describe('getCurrentMood', () => {
        it('should return null when no mood is set', () => {
            expect(audioTools.getCurrentMood()).toBeNull();
        });
    });

    describe('getAvailableMoods', () => {
        it('should return list of available moods', () => {
            const moods = audioTools.getAvailableMoods();

            expect(moods).toContain('talk');
            expect(moods).toContain('hype');
            expect(moods).toContain('game_focus');
            expect(moods).toContain('cinema');
            expect(moods).toContain('celebration');
            expect(moods).toContain('mute_all');
        });
    });
});
