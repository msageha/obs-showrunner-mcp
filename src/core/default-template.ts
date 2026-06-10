/**
 * Default Show Template
 */

import type { ShowTemplate } from '../types/index.js';

/**
 * Built-in template registered under the id "default" so start_show works
 * without any external configuration. Segments carry no scene names, so
 * starting a show never fails on a missing OBS scene out of the box.
 */
export const DEFAULT_SHOW_TEMPLATE: ShowTemplate = {
    id: 'default',
    name: 'Default Show',
    description:
        'Built-in show template with opening, main, and ending segments.',
    segments: [
        { id: 'opening', name: 'Opening', type: 'opening', timerSec: 300 },
        { id: 'main', name: 'Main', type: 'talk' },
        { id: 'ending', name: 'Ending', type: 'ending', timerSec: 300 },
    ],
};
