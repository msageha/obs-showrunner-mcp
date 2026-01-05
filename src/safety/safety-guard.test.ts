/**
 * Safety Guard Tests - TDD
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyGuard } from './safety-guard.js';
import type { SafetyMode } from '../types/index.js';

describe('SafetyGuard', () => {
    let guard: SafetyGuard;

    beforeEach(() => {
        guard = new SafetyGuard();
    });

    describe('initial state', () => {
        it('should default to strict mode', () => {
            expect(guard.getMode()).toBe('strict');
        });
    });

    describe('setMode', () => {
        it('should change safety mode', () => {
            guard.setMode('normal');
            expect(guard.getMode()).toBe('normal');
        });

        it('should accept debug mode', () => {
            guard.setMode('debug');
            expect(guard.getMode()).toBe('debug');
        });
    });

    describe('canPerformOperation', () => {
        describe('in strict mode', () => {
            beforeEach(() => {
                guard.setMode('strict');
            });

            it('should allow safe operations', () => {
                expect(guard.canPerformOperation('switch_scene')).toBe(true);
                expect(guard.canPerformOperation('show_overlay')).toBe(true);
                expect(guard.canPerformOperation('trigger_effect')).toBe(true);
            });

            it('should block stop_streaming', () => {
                expect(guard.canPerformOperation('stop_streaming')).toBe(false);
            });

            it('should block stop_recording', () => {
                expect(guard.canPerformOperation('stop_recording')).toBe(false);
            });

            it('should block delete_scene', () => {
                expect(guard.canPerformOperation('delete_scene')).toBe(false);
            });

            it('should block delete_recording', () => {
                expect(guard.canPerformOperation('delete_recording')).toBe(false);
            });
        });

        describe('in normal mode', () => {
            beforeEach(() => {
                guard.setMode('normal');
                guard.configure({
                    allowStopStreaming: true,
                    allowStopRecording: true,
                });
            });

            it('should allow configured dangerous operations', () => {
                expect(guard.canPerformOperation('stop_streaming')).toBe(true);
                expect(guard.canPerformOperation('stop_recording')).toBe(true);
            });

            it('should still block delete operations', () => {
                expect(guard.canPerformOperation('delete_scene')).toBe(false);
                expect(guard.canPerformOperation('delete_recording')).toBe(false);
            });
        });

        describe('in debug mode', () => {
            beforeEach(() => {
                guard.setMode('debug');
            });

            it('should block all dangerous operations (dry-run)', () => {
                expect(guard.canPerformOperation('stop_streaming')).toBe(false);
                expect(guard.canPerformOperation('stop_recording')).toBe(false);
            });
        });
    });

    describe('validateOperation', () => {
        it('should return success for allowed operations', () => {
            const result = guard.validateOperation('switch_scene');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return failure with reason for blocked operations', () => {
            guard.setMode('strict');
            const result = guard.validateOperation('stop_streaming');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('blocked');
        });
    });

    describe('isDryRun', () => {
        it('should return true in debug mode', () => {
            guard.setMode('debug');
            expect(guard.isDryRun()).toBe(true);
        });

        it('should return false in strict mode', () => {
            guard.setMode('strict');
            expect(guard.isDryRun()).toBe(false);
        });

        it('should return false in normal mode', () => {
            guard.setMode('normal');
            expect(guard.isDryRun()).toBe(false);
        });
    });

    describe('operation logging', () => {
        it('should log operations', () => {
            guard.logOperation('switch_scene', { sceneName: 'Scene 1' }, true);
            const logs = guard.getOperationLog(1);
            expect(logs).toHaveLength(1);
            expect(logs[0].operation).toBe('switch_scene');
            expect(logs[0].success).toBe(true);
        });

        it('should limit log size', () => {
            for (let i = 0; i < 150; i++) {
                guard.logOperation('test_op', {}, true);
            }
            const logs = guard.getOperationLog();
            expect(logs.length).toBeLessThanOrEqual(100);
        });
    });
});
