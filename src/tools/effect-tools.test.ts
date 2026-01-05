/**
 * Effect Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectTools } from './effect-tools.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { ShowStateManager } from '../core/show-state.js';
import { SafetyGuard } from '../safety/safety-guard.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            setSceneItemEnabled: vi.fn().mockResolvedValue(undefined),
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

    describe('triggerEffect', () => {
        it('should trigger hype effect', async () => {
            const result = await effectTools.triggerEffect({
                effectType: 'hype',
                intensity: 0.8,
            });

            expect(result.success).toBe(true);
        });

        it('should trigger effect with message', async () => {
            const result = await effectTools.triggerEffect({
                effectType: 'alert',
                message: 'Important announcement!',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('showOverlay', () => {
        it('should show overlay by id', async () => {
            const result = await effectTools.showOverlay({
                overlayId: 'title-card',
                params: { title: 'Welcome!' },
            });

            expect(result.success).toBe(true);
            expect(result.data?.visible).toBe(true);
        });
    });

    describe('hideOverlay', () => {
        it('should hide overlay by id', async () => {
            await effectTools.showOverlay({ overlayId: 'title-card' });
            const result = await effectTools.hideOverlay({ overlayId: 'title-card' });

            expect(result.success).toBe(true);
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
