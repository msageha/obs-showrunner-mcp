/**
 * Show State Manager Tests - TDD
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShowStateManager } from './show-state.js';
import type { ShowTemplate, ShowState, SegmentState } from '../types/index.js';

describe('ShowStateManager', () => {
    let manager: ShowStateManager;
    let testTemplate: ShowTemplate;

    beforeEach(() => {
        manager = new ShowStateManager();
        testTemplate = {
            id: 'test-show',
            name: 'Test Show',
            description: 'A test show template',
            segments: [
                {
                    id: 'opening',
                    name: 'Opening',
                    type: 'opening',
                    defaultLayoutId: 'layout-opening',
                    defaultSceneName: 'Opening Scene',
                    timerSec: 60,
                },
                {
                    id: 'main',
                    name: 'Main Content',
                    type: 'talk',
                    defaultLayoutId: 'layout-main',
                    defaultSceneName: 'Main Scene',
                    defaultAudioMood: 'talk',
                },
                {
                    id: 'ending',
                    name: 'Ending',
                    type: 'ending',
                    defaultLayoutId: 'layout-ending',
                    defaultSceneName: 'Ending Scene',
                    timerSec: 30,
                },
            ],
            defaultAudioMood: 'talk',
        };
    });

    describe('initial state', () => {
        it('should have null show state initially', () => {
            const state = manager.getCurrentState();
            expect(state.showId).toBeNull();
            expect(state.currentSegment).toBeNull();
            expect(state.segments).toEqual([]);
        });
    });

    describe('registerTemplate', () => {
        it('should register a show template', () => {
            manager.registerTemplate(testTemplate);
            const template = manager.getTemplate('test-show');
            expect(template).toBeDefined();
            expect(template?.name).toBe('Test Show');
        });

        it('should overwrite existing template with same id', () => {
            manager.registerTemplate(testTemplate);
            const updatedTemplate = { ...testTemplate, name: 'Updated Show' };
            manager.registerTemplate(updatedTemplate);
            const template = manager.getTemplate('test-show');
            expect(template?.name).toBe('Updated Show');
        });
    });

    describe('startShow', () => {
        it('should start show with first segment', () => {
            manager.registerTemplate(testTemplate);
            const state = manager.startShow('test-show');

            expect(state.showId).toBe('test-show');
            expect(state.showName).toBe('Test Show');
            expect(state.currentSegment?.id).toBe('opening');
            expect(state.currentSegment?.name).toBe('Opening');
            expect(state.startedAt).toBeGreaterThan(0);
        });

        it('should start show at specific segment', () => {
            manager.registerTemplate(testTemplate);
            const state = manager.startShow('test-show', { startSegmentId: 'main' });

            expect(state.currentSegment?.id).toBe('main');
        });

        it('should skip opening segment if requested', () => {
            manager.registerTemplate(testTemplate);

            // First segment after opening (when skipOpening is true)
            const state = manager.startShow('test-show', { skipOpening: true });

            // Should skip to the next segment after opening
            expect(state.currentSegment?.id).toBe('main');
        });

        it('should throw error for unknown template', () => {
            expect(() => manager.startShow('unknown')).toThrow('Template not found');
        });

        it('should throw error if show already running', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');
            expect(() => manager.startShow('test-show')).toThrow('Show already running');
        });
    });

    describe('endShow', () => {
        it('should end the current show', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');
            manager.endShow();

            const state = manager.getCurrentState();
            expect(state.showId).toBeNull();
            expect(state.currentSegment).toBeNull();
        });

        it('should not throw when no show is running', () => {
            expect(() => manager.endShow()).not.toThrow();
        });
    });

    describe('switchSegment', () => {
        it('should switch to specified segment', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');

            const state = manager.switchSegment('main');

            expect(state.currentSegment?.id).toBe('main');
            expect(state.currentSegment?.name).toBe('Main Content');
            expect(state.currentSegment?.sceneName).toBe('Main Scene');
        });

        it('should update segment startedAt time', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');
            const firstStartedAt = manager.getCurrentState().currentSegment?.startedAt;

            // Wait a tiny bit to ensure time difference
            manager.switchSegment('main');
            const secondStartedAt = manager.getCurrentState().currentSegment?.startedAt;

            expect(secondStartedAt).toBeGreaterThanOrEqual(firstStartedAt!);
        });

        it('should throw error for unknown segment', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');

            expect(() => manager.switchSegment('unknown')).toThrow('Segment not found');
        });

        it('should throw error when no show is running', () => {
            expect(() => manager.switchSegment('main')).toThrow('No show running');
        });
    });

    describe('extendSegment', () => {
        it('should extend segment timer by specified minutes', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show'); // Opening has 60 sec timer

            const state = manager.getCurrentState();
            const originalRemaining = state.currentSegment?.timerRemainingSec ?? 0;

            manager.extendSegment(5); // Add 5 minutes

            const updatedState = manager.getCurrentState();
            expect(updatedState.currentSegment?.timerRemainingSec).toBe(
                originalRemaining + 5 * 60
            );
        });

        it('should set the timer when the segment has none', () => {
            manager.registerTemplate(testTemplate);
            // 'main' segment has no timerSec defined
            manager.startShow('test-show', { startSegmentId: 'main' });

            expect(
                manager.getCurrentState().currentSegment?.timerRemainingSec
            ).toBeUndefined();

            manager.extendSegment(2);

            expect(
                manager.getCurrentState().currentSegment?.timerRemainingSec
            ).toBe(2 * 60);
        });

        it('should throw error when no show is running', () => {
            expect(() => manager.extendSegment(5)).toThrow('No show running');
        });
    });

    describe('getSegmentList', () => {
        it('should return list of segments for current show', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');

            const segments = manager.getSegmentList();
            expect(segments).toHaveLength(3);
            expect(segments[0].id).toBe('opening');
            expect(segments[1].id).toBe('main');
            expect(segments[2].id).toBe('ending');
        });

        it('should return empty array when no show is running', () => {
            const segments = manager.getSegmentList();
            expect(segments).toEqual([]);
        });
    });

    describe('isShowRunning', () => {
        it('should return false when no show is running', () => {
            expect(manager.isShowRunning()).toBe(false);
        });

        it('should return true when show is running', () => {
            manager.registerTemplate(testTemplate);
            manager.startShow('test-show');
            expect(manager.isShowRunning()).toBe(true);
        });
    });
});
