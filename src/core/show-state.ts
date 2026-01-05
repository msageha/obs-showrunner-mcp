/**
 * Show State Manager
 * Manages show templates, segments, and runtime state
 */

import type {
    ShowTemplate,
    ShowState,
    SegmentTemplate,
    SegmentState,
    OverlayState,
    TimerState,
} from '../types/index.js';

export interface StartShowOptions {
    skipOpening?: boolean;
    startSegmentId?: string;
}

export class ShowStateManager {
    private templates: Map<string, ShowTemplate> = new Map();
    private state: ShowState;

    constructor() {
        this.state = this.createEmptyState();
    }

    /**
     * Create an empty show state
     */
    private createEmptyState(): ShowState {
        return {
            showId: null,
            showName: null,
            currentSegment: null,
            segments: [],
            overlays: [],
            timers: [],
            startedAt: null,
        };
    }

    /**
     * Register a show template
     */
    registerTemplate(template: ShowTemplate): void {
        this.templates.set(template.id, template);
    }

    /**
     * Get a registered template by ID
     */
    getTemplate(templateId: string): ShowTemplate | undefined {
        return this.templates.get(templateId);
    }

    /**
     * Get list of all registered templates
     */
    getTemplateList(): ShowTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Start a show from a template
     */
    startShow(templateId: string, options?: StartShowOptions): ShowState {
        if (this.state.showId !== null) {
            throw new Error('Show already running');
        }

        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        const now = Date.now();

        // Determine starting segment
        let startSegment: SegmentTemplate;
        if (options?.startSegmentId) {
            const segment = template.segments.find(
                (s) => s.id === options.startSegmentId
            );
            if (!segment) {
                throw new Error('Start segment not found');
            }
            startSegment = segment;
        } else if (options?.skipOpening) {
            // Skip the opening segment (find first non-opening segment)
            const nonOpeningSegment = template.segments.find(
                (s) => s.type !== 'opening'
            );
            startSegment = nonOpeningSegment ?? template.segments[0];
        } else {
            startSegment = template.segments[0];
        }

        // Create segment state
        const segmentState = this.createSegmentState(startSegment, now);

        // Update state
        this.state = {
            showId: template.id,
            showName: template.name,
            currentSegment: segmentState,
            segments: template.segments,
            overlays: [],
            timers: [],
            startedAt: now,
        };

        return this.state;
    }

    /**
     * End the current show
     */
    endShow(): void {
        this.state = this.createEmptyState();
    }

    /**
     * Switch to a different segment
     */
    switchSegment(segmentId: string): ShowState {
        if (this.state.showId === null) {
            throw new Error('No show running');
        }

        const segment = this.state.segments.find((s) => s.id === segmentId);
        if (!segment) {
            throw new Error('Segment not found');
        }

        const now = Date.now();
        this.state.currentSegment = this.createSegmentState(segment, now);

        return this.state;
    }

    /**
     * Extend the current segment timer
     */
    extendSegment(minutes: number): ShowState {
        if (this.state.showId === null) {
            throw new Error('No show running');
        }

        if (this.state.currentSegment?.timerRemainingSec !== undefined) {
            this.state.currentSegment.timerRemainingSec += minutes * 60;
        }

        return this.state;
    }

    /**
     * Get the current show state
     */
    getCurrentState(): ShowState {
        return { ...this.state };
    }

    /**
     * Get list of segments for current show
     */
    getSegmentList(): SegmentTemplate[] {
        return [...this.state.segments];
    }

    /**
     * Check if a show is currently running
     */
    isShowRunning(): boolean {
        return this.state.showId !== null;
    }

    /**
     * Add an overlay to the state
     */
    addOverlay(overlay: OverlayState): void {
        const existing = this.state.overlays.findIndex((o) => o.id === overlay.id);
        if (existing >= 0) {
            this.state.overlays[existing] = overlay;
        } else {
            this.state.overlays.push(overlay);
        }
    }

    /**
     * Remove an overlay from the state
     */
    removeOverlay(overlayId: string): void {
        this.state.overlays = this.state.overlays.filter((o) => o.id !== overlayId);
    }

    /**
     * Update overlay visibility
     */
    setOverlayVisible(overlayId: string, visible: boolean): void {
        const overlay = this.state.overlays.find((o) => o.id === overlayId);
        if (overlay) {
            overlay.visible = visible;
        }
    }

    /**
     * Create a segment state from a template
     */
    private createSegmentState(
        segment: SegmentTemplate,
        timestamp: number
    ): SegmentState {
        return {
            id: segment.id,
            name: segment.name,
            type: segment.type,
            startedAt: timestamp,
            timerRemainingSec: segment.timerSec,
            sceneName: segment.defaultSceneName,
        };
    }
}
