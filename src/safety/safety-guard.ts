/**
 * Safety Guard
 * Controls dangerous operations and enforces safety policies
 */

import type { SafetyMode, SafetyConfig } from '../types/index.js';

export interface OperationValidation {
    allowed: boolean;
    reason?: string;
}

const DANGEROUS_OPERATIONS = new Set([
    'stop_streaming',
    'stop_recording',
    'delete_scene',
    'delete_recording',
    'delete_profile',
]);

/**
 * Permissiveness ranking: a runtime setMode may only move to a mode that is
 * not more permissive than the baseline configured at startup. debug is the
 * least permissive (dry-run, nothing executes), normal the most.
 */
const MODE_PERMISSIVENESS: Record<SafetyMode, number> = {
    debug: 0,
    strict: 1,
    normal: 2,
};

export class SafetyGuard {
    private mode: SafetyMode = 'strict';
    private baselineMode: SafetyMode = 'strict';
    private config: SafetyConfig = {
        mode: 'strict',
        allowStopStreaming: false,
        allowStopRecording: false,
    };

    /**
     * Get current safety mode
     */
    getMode(): SafetyMode {
        return this.mode;
    }

    /**
     * Set safety mode at runtime. Escalating above the baseline configured at
     * startup is rejected so an MCP client cannot lift its own restrictions
     * (e.g. strict -> normal to unlock stop_streaming).
     */
    setMode(mode: SafetyMode): void {
        if (MODE_PERMISSIVENESS[mode] > MODE_PERMISSIVENESS[this.baselineMode]) {
            throw new Error(
                `Cannot switch safety mode to '${mode}': it is more permissive than ` +
                `the configured baseline '${this.baselineMode}'. Change SAFETY_MODE ` +
                'in the server environment instead.'
            );
        }
        this.mode = mode;
        this.config.mode = mode;
    }

    /**
     * Configure safety settings (startup configuration).
     * The configured mode becomes the baseline for runtime mode changes.
     */
    configure(config: Partial<SafetyConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.mode) {
            this.mode = config.mode;
            this.baselineMode = config.mode;
        }
    }

    /**
     * Check if an operation is allowed
     */
    canPerformOperation(operation: string): boolean {
        // Safe operations are always allowed
        if (!DANGEROUS_OPERATIONS.has(operation)) {
            return true;
        }

        // In debug mode, block all dangerous operations (dry-run)
        if (this.mode === 'debug') {
            return false;
        }

        // In strict mode, block all dangerous operations
        if (this.mode === 'strict') {
            return false;
        }

        // In normal mode, check configuration
        if (this.mode === 'normal') {
            switch (operation) {
                case 'stop_streaming':
                    return this.config.allowStopStreaming;
                case 'stop_recording':
                    return this.config.allowStopRecording;
                default:
                    // Delete operations are never allowed in normal mode
                    return false;
            }
        }

        return false;
    }

    /**
     * Validate operation and return result with reason
     */
    validateOperation(operation: string): OperationValidation {
        const allowed = this.canPerformOperation(operation);
        if (allowed) {
            return { allowed: true };
        }

        let reason: string;
        if (this.mode === 'strict') {
            reason = `Operation '${operation}' is blocked in strict safety mode`;
        } else if (this.mode === 'debug') {
            reason = `Operation '${operation}' is blocked (dry-run mode active)`;
        } else {
            reason = `Operation '${operation}' is not allowed by current configuration`;
        }

        return { allowed: false, reason };
    }

    /**
     * Check if dry-run mode is active
     */
    isDryRun(): boolean {
        return this.mode === 'debug';
    }
}
