/**
 * Show Tools Tests - TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShowTools } from './show-tools.js';
import { ShowStateManager } from '../core/show-state.js';
import { OBSAdapter } from '../adapters/obs-adapter.js';
import { SafetyGuard } from '../safety/safety-guard.js';
import type { ShowTemplate } from '../types/index.js';

// Mock OBS Adapter
vi.mock('../adapters/obs-adapter.js', () => {
    return {
        OBSAdapter: vi.fn().mockImplementation(() => ({
            setCurrentScene: vi.fn().mockResolvedValue(undefined),
            isConnected: vi.fn().mockReturnValue(true),
        })),
    };
});

describe('ShowTools', () => {
    let showTools: ShowTools;
    let showState: ShowStateManager;
    let obsAdapter: OBSAdapter;
    let safetyGuard: SafetyGuard;
    let testTemplate: ShowTemplate;

    beforeEach(() => {
        showState = new ShowStateManager();
        obsAdapter = new OBSAdapter();
        safetyGuard = new SafetyGuard();

        testTemplate = {
            id: 'test-show',
            name: 'Test Show',
            segments: [
                {
                    id: 'opening',
                    name: 'Opening',
                    type: 'opening',
                    defaultLayoutId: 'layout-1',
                    defaultSceneName: 'Opening Scene',
                    timerSec: 60,
                },
                {
                    id: 'main',
                    name: 'Main',
                    type: 'talk',
                    defaultLayoutId: 'layout-2',
                    defaultSceneName: 'Main Scene',
                },
                {
                    id: 'ending',
                    name: 'Ending',
                    type: 'ending',
                    defaultLayoutId: 'layout-3',
                    defaultSceneName: 'Ending Scene',
                },
            ],
        };

        showState.registerTemplate(testTemplate);
        showTools = new ShowTools(showState, obsAdapter, safetyGuard);
    });

    describe('startShow', () => {
        it('should start show and return success', async () => {
            const result = await showTools.startShow({
                showTemplateId: 'test-show',
            });

            expect(result.success).toBe(true);
            expect(result.data?.showId).toBe('test-show');
            expect((result.data?.currentSegment as any)?.id).toBe('opening');
        });

        it('should switch OBS scene on start', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });

            expect(obsAdapter.setCurrentScene).toHaveBeenCalledWith('Opening Scene');
        });

        it('should skip opening when requested', async () => {
            const result = await showTools.startShow({
                showTemplateId: 'test-show',
                options: { skipOpening: true },
            });

            expect((result.data?.currentSegment as any)?.id).toBe('main');
        });

        it('should return error for unknown template', async () => {
            const result = await showTools.startShow({
                showTemplateId: 'unknown',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('endShow', () => {
        it('should end show successfully', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            const result = await showTools.endShow({});

            expect(result.success).toBe(true);
            expect(showState.isShowRunning()).toBe(false);
        });

        it('should block stop_streaming in strict mode', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            safetyGuard.setMode('strict');

            const result = await showTools.endShow({
                options: { stopStreaming: true },
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('blocked');
        });

        it('should allow stop_streaming in normal mode when configured', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            safetyGuard.setMode('normal');
            safetyGuard.configure({ allowStopStreaming: true });

            const result = await showTools.endShow({
                options: { stopStreaming: true },
            });

            expect(result.success).toBe(true);
        });
    });

    describe('switchSegment', () => {
        it('should switch segment successfully', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            const result = await showTools.switchSegment({ segmentId: 'main' });

            expect(result.success).toBe(true);
            expect((result.data?.currentSegment as any)?.id).toBe('main');
        });

        it('should switch OBS scene', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            await showTools.switchSegment({ segmentId: 'main' });

            expect(obsAdapter.setCurrentScene).toHaveBeenCalledWith('Main Scene');
        });

        it('should return error for unknown segment', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            const result = await showTools.switchSegment({ segmentId: 'unknown' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('extendSegment', () => {
        it('should extend segment timer', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            const result = await showTools.extendSegment({ minutes: 5 });

            expect(result.success).toBe(true);
            // Opening has 60 sec, + 5 min = 360 sec
            expect(result.data?.newEndTime).toBe(360);
        });
    });

    describe('getCurrentShowState', () => {
        it('should return current show state', async () => {
            await showTools.startShow({ showTemplateId: 'test-show' });
            const result = showTools.getCurrentShowState();

            expect(result.success).toBe(true);
            expect(result.data?.showId).toBe('test-show');
            expect((result.data?.segments as any[])?.length).toBe(3);
        });

        it('should return null state when no show running', () => {
            const result = showTools.getCurrentShowState();

            expect(result.success).toBe(true);
            expect(result.data?.showId).toBeNull();
        });
    });
});
