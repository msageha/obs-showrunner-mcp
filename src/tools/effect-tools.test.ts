/**
 * Effect Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EffectTools } from './effect-tools.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { ShowStateManager } from '../core/show-state.js';
import { SafetyGuard } from '../safety/safety-guard.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            setSceneItemEnabled: vi.fn().mockResolvedValue(undefined),
            getSceneList: vi.fn().mockResolvedValue({
                currentProgramSceneName: 'Live Scene',
                currentProgramSceneUuid: 'uuid-live',
                scenes: [],
            }),
            isConnected: vi.fn().mockReturnValue(true),
        })),
    };
});

describe('EffectTools', () => {
    let effectTools: EffectTools;
    let obsAdapter: OBSAdapter;
    let showState: ShowStateManager;
    let safetyGuard: SafetyGuard;

    beforeEach(() => {
        obsAdapter = new OBSAdapter();
        showState = new ShowStateManager();
        safetyGuard = new SafetyGuard();
        effectTools = new EffectTools(obsAdapter, showState, safetyGuard);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('triggerEffect', () => {
        it('should enable the effect scene item in the current scene', async () => {
            const result = await effectTools.triggerEffect({ effectType: 'hype' });

            expect(result.success).toBe(true);
            expect(obsAdapter.setSceneItemEnabled).toHaveBeenCalledWith(
                'Live Scene',
                'hype',
                true
            );
        });

        it('should auto-revert the effect after durationSec', async () => {
            vi.useFakeTimers();

            await effectTools.triggerEffect({ effectType: 'confetti', durationSec: 3 });
            expect(obsAdapter.setSceneItemEnabled).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(3000);

            expect(obsAdapter.setSceneItemEnabled).toHaveBeenCalledTimes(2);
            expect(obsAdapter.setSceneItemEnabled).toHaveBeenLastCalledWith(
                'Live Scene',
                'confetti',
                false
            );
        });

        it('should not revert when autoRevert is false', async () => {
            vi.useFakeTimers();

            await effectTools.triggerEffect({
                effectType: 'alert',
                durationSec: 1,
                autoRevert: false,
            });
            await vi.advanceTimersByTimeAsync(5000);

            expect(obsAdapter.setSceneItemEnabled).toHaveBeenCalledTimes(1);
        });

        it('should fail when the scene item does not exist', async () => {
            (
                obsAdapter.setSceneItemEnabled as ReturnType<typeof vi.fn>
            ).mockRejectedValueOnce(new Error('No scene items were found'));

            const result = await effectTools.triggerEffect({ effectType: 'missing' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('No scene items');
        });

        it('should skip OBS calls in dry-run mode', async () => {
            safetyGuard.configure({ mode: 'debug' });

            const result = await effectTools.triggerEffect({ effectType: 'hype' });

            expect(result.success).toBe(true);
            expect(result.data?.dryRun).toBe(true);
            expect(obsAdapter.setSceneItemEnabled).not.toHaveBeenCalled();
        });
    });

    describe('showOverlay', () => {
        it('should enable the overlay scene item and track state', async () => {
            const result = await effectTools.showOverlay({
                overlayId: 'title-card',
                params: { title: 'Welcome!' },
            });

            expect(result.success).toBe(true);
            expect(result.data?.visible).toBe(true);
            expect(obsAdapter.setSceneItemEnabled).toHaveBeenCalledWith(
                'Live Scene',
                'title-card',
                true
            );
        });

        it('should fail when there is no active program scene', async () => {
            (obsAdapter.getSceneList as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                currentProgramSceneName: null,
                scenes: [],
            });

            const result = await effectTools.showOverlay({ overlayId: 'title-card' });

            expect(result.success).toBe(false);
            expect(obsAdapter.setSceneItemEnabled).not.toHaveBeenCalled();
        });
    });

    describe('hideOverlay', () => {
        it('should disable the overlay scene item', async () => {
            await effectTools.showOverlay({ overlayId: 'title-card' });
            const result = await effectTools.hideOverlay({ overlayId: 'title-card' });

            expect(result.success).toBe(true);
            expect(obsAdapter.setSceneItemEnabled).toHaveBeenLastCalledWith(
                'Live Scene',
                'title-card',
                false
            );
        });
    });

    describe('markHighlight', () => {
        it('should create highlight marker with timestamp', async () => {
            const result = await effectTools.markHighlight({
                description: 'Boss defeated!',
            });

            expect(result.success).toBe(true);
            expect(result.data?.highlightId).toBeDefined();
            expect(result.data?.timestamp).toBeGreaterThan(0);
        });

        it('should store highlight in list', async () => {
            await effectTools.markHighlight({ description: 'Highlight 1' });
            await effectTools.markHighlight({ description: 'Highlight 2' });

            const highlights = effectTools.getHighlights();
            expect(highlights).toHaveLength(2);
        });
    });

    describe('getHighlights', () => {
        it('should return empty array initially', () => {
            expect(effectTools.getHighlights()).toEqual([]);
        });
    });
});
