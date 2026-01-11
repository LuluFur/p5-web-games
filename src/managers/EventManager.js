/**
 * EventManager.js - Centralized event system for game-wide events
 * Implements publish-subscribe pattern for decoupled communication
 *
 * Usage:
 *   EVENTS.emit('wave_complete', { wave: 5, enemies: 25 });
 *   EVENTS.on('enemy_death', (data) => console.log('Enemy died!', data));
 */

// Event name constants (prevents typos)
const EVENT_NAMES = {
    // Wave events
    WAVE_START: 'wave_start',
    WAVE_COMPLETE: 'wave_complete',
    WAVE_SPAWN_ENEMY: 'wave_spawn_enemy',

    // Territory events
    TERRITORY_UNLOCK: 'territory_unlock',

    // Enemy events
    ENEMY_SPAWN: 'enemy_spawn',
    ENEMY_DEATH: 'enemy_death',
    ENEMY_REACH_BASE: 'enemy_reach_base',
    BOSS_DEFEAT: 'boss_defeat',

    // Tower events
    TOWER_PLACE: 'tower_place',
    TOWER_SELL: 'tower_sell',
    TOWER_UPGRADE: 'tower_upgrade',
    TOWER_MERGE: 'tower_merge',
    TOWER_SELECT: 'tower_select',

    // Economy events
    GOLD_GAIN: 'gold_gain',
    GOLD_SPEND: 'gold_spend',
    LIFE_LOST: 'life_lost',

    // Tutorial events
    TUTORIAL_START: 'tutorial_start',
    TUTORIAL_COMPLETE: 'tutorial_complete',
    TUTORIAL_STEP: 'tutorial_step',

    // UI events
    BUTTON_CLICK: 'button_click',

    // Game events
    GAME_OVER: 'game_over',
    STATE_CHANGE: 'state_change',

    // RTS-specific events

    // Unit events (RTS)
    UNIT_CREATED: 'unit_created',
    UNIT_DESTROYED: 'unit_destroyed',

    // Building events (RTS)
    BUILDING_PLACED: 'building_placed',
    BUILDING_COMPLETE: 'building_complete',
    BUILDING_DESTROYED: 'building_destroyed',

    // Visibility events (RTS)
    ENEMY_REVEALED: 'enemy_revealed',
    ENEMY_BASE_DISCOVERED: 'enemy_base_discovered',

    // AI patrol events (RTS)
    AI_PATROL_STARTED: 'ai_patrol_started',
    AI_PATROL_WAYPOINT_COMPLETE: 'ai_patrol_waypoint_complete'
};

class EventManager {
    constructor() {
        if (EventManager.instance) return EventManager.instance;
        EventManager.instance = this;

        this.listeners = new Map(); // eventName -> Set of callbacks
        this.eventHistory = []; // For debugging
        this.maxHistory = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event fires
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to an event (one time only)
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call once when event fires
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        return this.on(eventName, onceCallback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback to remove
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).delete(callback);

            // Clean up empty listener sets
            if (this.listeners.get(eventName).size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    /**
     * Emit an event to all listeners
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to listeners
     */
    emit(eventName, data = {}) {
        // Add to history for debugging
        this.eventHistory.push({
            event: eventName,
            data: data,
            timestamp: Date.now(),
            frame: typeof frameCount !== 'undefined' ? frameCount : -1
        });

        // Trim history
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }

        // Call all listeners
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`EventManager: Error in listener for '${eventName}':`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Name of the event
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.listeners.delete(eventName);
        } else {
            // Remove ALL listeners
            this.listeners.clear();
        }
    }

    /**
     * Get count of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this.listeners.has(eventName) ? this.listeners.get(eventName).size : 0;
    }

    /**
     * Get recent event history (for debugging)
     * @param {number} count - Number of recent events to return
     * @returns {Array} Recent events
     */
    getHistory(count = 10) {
        return this.eventHistory.slice(-count);
    }

    /**
     * Print debug info about current listeners
     */
    debug() {
        console.log('EventManager Debug:');
        console.log('Active Listeners:');
        this.listeners.forEach((callbacks, eventName) => {
            console.log(`  ${eventName}: ${callbacks.size} listener(s)`);
        });
        console.log('Recent Events:', this.getHistory(5));
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.EVENTS = new EventManager();
    window.EVENT_NAMES = EVENT_NAMES;
}
