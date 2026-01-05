/**
 * Safety Guard
 * Controls dangerous operations and enforces safety policies
 */

import type { SafetyMode, SafetyConfig } from '../types/index.js';

export interface OperationValidation {
    allowed: boolean;
    reason?: string;
}

export interface OperationLogEntry {
    timestamp: number;
    operation: string;
    params: Record<string, unknown>;
    success: boolean;
    dryRun: boolean;
}

const DANGEROUS_OPERATIONS = new Set([
    'stop_streaming',
    'stop_recording',
    'delete_scene',
    'delete_recording',
    'delete_profile',
]);

const MAX_LOG_SIZE = 100;

export class SafetyGuard {
    private mode: SafetyMode = 'strict';
    private config: SafetyConfig = {
        mode: 'strict',
        allowStopStreaming: false,
        allowStopRecording: false,
    };
    private operationLog: OperationLogEntry[] = [];

    /**
     * Get current safety mode
     */
    getMode(): SafetyMode {
        return this.mode;
    }

    /**
     * Set safety mode
     */
    setMode(mode: SafetyMode): void {
        this.mode = mode;
        this.config.mode = mode;
    }

    /**
     * Configure safety settings
     */
    configure(config: Partial<SafetyConfig>): void {
        this.config = { ...this.config, ...config };
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

    /**
     * Log an operation
     */
    logOperation(
        operation: string,
        params: Record<string, unknown>,
        success: boolean
    ): void {
        const entry: OperationLogEntry = {
            timestamp: Date.now(),
            operation,
            params,
            success,
            dryRun: this.isDryRun(),
        };

        this.operationLog.push(entry);

        // Trim log if it exceeds max size
        if (this.operationLog.length > MAX_LOG_SIZE) {
            this.operationLog = this.operationLog.slice(-MAX_LOG_SIZE);
        }
    }

    /**
     * Get operation log
     */
    getOperationLog(limit?: number): OperationLogEntry[] {
        if (limit) {
            return this.operationLog.slice(-limit);
        }
        return [...this.operationLog];
    }

    /**
     * Clear operation log
     */
    clearOperationLog(): void {
        this.operationLog = [];
    }
}
