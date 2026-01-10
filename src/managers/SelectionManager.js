/**
 * SelectionManager.js - RTS Unit Selection System
 *
 * Handles all selection mechanics for RTS gameplay:
 * - Single-click selection
 * - Box/marquee selection (drag to select multiple)
 * - Shift-click to add/remove from selection
 * - Control groups (Ctrl+1-9 to assign, 1-9 to recall)
 * - Double-click to select all of same type
 * - Right-click command issuing
 *
 * Emits events via EventManager for UI updates
 */

class SelectionManager {
    constructor(game) {
        this.game = game;

        // Currently selected units
        this.selectedUnits = [];

        // Currently selected building
        this.selectedBuilding = null;

        // Control groups (1-9, index 0-8)
        this.controlGroups = [[], [], [], [], [], [], [], [], []];

        // Box selection state
        this.isBoxSelecting = false;
        this.boxStartX = 0;
        this.boxStartY = 0;
        this.boxCurrentX = 0;
        this.boxCurrentY = 0;

        // Double-click detection
        this.lastClickTime = 0;
        this.lastClickX = 0;
        this.lastClickY = 0;
        this.doubleClickThreshold = RTS_CONTROLS?.DOUBLE_CLICK_MS || 300;
        this.doubleClickRadius = 10; // Pixels tolerance for double-click

        // Selection colors
        this.ownSelectionColor = color(0, 255, 0);      // Green for own units
        this.allySelectionColor = color(0, 200, 255);   // Cyan for allies
        this.enemySelectionColor = color(255, 0, 0);    // Red for enemies

        // Box selection appearance
        this.boxFillColor = color(0, 255, 0, 30);
        this.boxStrokeColor = color(0, 255, 0, 200);

        console.log("SelectionManager: Initialized");
    }

    /**
     * Get all units from the game's unit manager
     * @returns {Unit[]} Array of all units
     */
    getAllUnits() {
        if (this.game.unitManager) {
            return this.game.unitManager.getAllUnits();
        }
        return [];
    }

    /**
     * Get units owned by the local player
     * @returns {Unit[]} Array of player-owned units
     */
    getPlayerUnits() {
        const allUnits = this.getAllUnits();
        const localPlayer = this.game.localPlayer;
        if (!localPlayer) return allUnits;

        return allUnits.filter(unit => unit.owner === localPlayer);
    }

    // ========================================
    // SELECTION METHODS
    // ========================================

    /**
     * Select a single unit
     * @param {Unit} unit - The unit to select
     * @param {boolean} addToSelection - If true, adds to current selection
     */
    selectUnit(unit, addToSelection = false) {
        if (!unit || unit.isDead()) return;

        if (!addToSelection) {
            this.clearSelection();
        }

        // Only select if not already selected
        if (!this.selectedUnits.includes(unit)) {
            this.selectedUnits.push(unit);
            unit.select();
        }

        this.emitSelectionChanged();
    }

    /**
     * Deselect a specific unit
     * @param {Unit} unit - The unit to deselect
     */
    deselectUnit(unit) {
        const index = this.selectedUnits.indexOf(unit);
        if (index !== -1) {
            this.selectedUnits.splice(index, 1);
            unit.deselect();
            this.emitSelectionChanged();
        }
    }

    /**
     * Toggle selection of a unit (for shift-click)
     * @param {Unit} unit - The unit to toggle
     */
    toggleUnitSelection(unit) {
        if (!unit || unit.isDead()) return;

        if (this.selectedUnits.includes(unit)) {
            this.deselectUnit(unit);
        } else {
            this.selectedUnits.push(unit);
            unit.select();
            this.emitSelectionChanged();
        }
    }

    /**
     * Select multiple units at once
     * @param {Unit[]} units - Array of units to select
     * @param {boolean} addToSelection - If true, adds to current selection
     */
    selectUnits(units, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }

        for (const unit of units) {
            if (unit && !unit.isDead() && !this.selectedUnits.includes(unit)) {
                this.selectedUnits.push(unit);
                unit.select();
            }
        }

        this.emitSelectionChanged();
    }

    /**
     * Clear all selection (units and buildings)
     */
    clearSelection() {
        for (const unit of this.selectedUnits) {
            if (unit) unit.deselect();
        }
        this.selectedUnits = [];

        // Clear building selection
        if (this.selectedBuilding) {
            this.selectedBuilding.selected = false;
            this.selectedBuilding = null;
        }

        this.emitSelectionChanged();
    }

    /**
     * Select a building
     * @param {Building} building - The building to select
     */
    selectBuilding(building) {
        if (!building) return;

        // Clear previous selection
        this.clearSelection();

        // Select the building
        this.selectedBuilding = building;
        building.selected = true;  // Building uses 'selected' not 'isSelected'

        this.emitSelectionChanged();
        console.log(`Selected building: ${building.name || building.type}`);
    }

    /**
     * Get building at a world position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {Building|null}
     */
    getBuildingAtPosition(x, y) {
        if (!this.game.buildingManager) return null;

        const cellSize = this.game.grid ? this.game.grid.cellSize : 32;

        for (const building of this.game.buildingManager.buildings) {
            const bx = building.gridX * cellSize;
            const by = building.gridY * cellSize;
            const bw = building.width * cellSize;
            const bh = building.height * cellSize;

            if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
                return building;
            }
        }

        return null;
    }

    /**
     * Select all units of the same type as a given unit (double-click behavior)
     * @param {Unit} unit - The reference unit
     */
    selectAllOfType(unit) {
        if (!unit) return;

        const sameTypeUnits = this.getPlayerUnits().filter(u =>
            u.config && unit.config &&
            u.config.name === unit.config.name &&
            !u.isDead()
        );

        this.selectUnits(sameTypeUnits);
    }

    /**
     * Select all player units on screen
     */
    selectAllOnScreen() {
        const screenUnits = this.getPlayerUnits().filter(unit =>
            !unit.isDead() && this.isOnScreen(unit)
        );
        this.selectUnits(screenUnits);
    }

    /**
     * Check if a unit is visible on screen
     */
    isOnScreen(unit) {
        const margin = 50;
        return unit.x >= -margin &&
               unit.x <= width + margin &&
               unit.y >= -margin &&
               unit.y <= height + margin;
    }

    // ========================================
    // BOX SELECTION
    // ========================================

    /**
     * Start box selection
     * @param {number} x - Start X coordinate
     * @param {number} y - Start Y coordinate
     */
    startBoxSelection(x, y) {
        this.isBoxSelecting = true;
        this.boxStartX = x;
        this.boxStartY = y;
        this.boxCurrentX = x;
        this.boxCurrentY = y;
    }

    /**
     * Update box selection during drag
     * @param {number} x - Current X coordinate
     * @param {number} y - Current Y coordinate
     */
    updateBoxSelection(x, y) {
        if (!this.isBoxSelecting) return;

        this.boxCurrentX = x;
        this.boxCurrentY = y;
    }

    /**
     * Complete box selection
     * @param {boolean} addToSelection - If true, adds to current selection
     */
    finishBoxSelection(addToSelection = false) {
        if (!this.isBoxSelecting) return;

        this.isBoxSelecting = false;

        // Calculate box bounds
        const left = Math.min(this.boxStartX, this.boxCurrentX);
        const right = Math.max(this.boxStartX, this.boxCurrentX);
        const top = Math.min(this.boxStartY, this.boxCurrentY);
        const bottom = Math.max(this.boxStartY, this.boxCurrentY);

        // If box is too small, treat as click
        if (right - left < 5 && bottom - top < 5) {
            return;
        }

        // Find all player units within the box
        const unitsInBox = this.getPlayerUnits().filter(unit => {
            if (unit.isDead()) return false;
            return unit.x >= left && unit.x <= right &&
                   unit.y >= top && unit.y <= bottom;
        });

        // Select units in box
        if (unitsInBox.length > 0) {
            this.selectUnits(unitsInBox, addToSelection);
        } else if (!addToSelection) {
            this.clearSelection();
        }
    }

    /**
     * Cancel box selection without selecting
     */
    cancelBoxSelection() {
        this.isBoxSelecting = false;
    }

    /**
     * Get the current box selection rectangle
     * @returns {object} Box bounds {x, y, w, h}
     */
    getBoxBounds() {
        if (!this.isBoxSelecting) return null;

        return {
            x: Math.min(this.boxStartX, this.boxCurrentX),
            y: Math.min(this.boxStartY, this.boxCurrentY),
            w: Math.abs(this.boxCurrentX - this.boxStartX),
            h: Math.abs(this.boxCurrentY - this.boxStartY)
        };
    }

    // ========================================
    // CONTROL GROUPS
    // ========================================

    /**
     * Assign current selection to a control group
     * @param {number} groupNum - Group number (1-9)
     */
    setControlGroup(groupNum) {
        const index = groupNum - 1;
        if (index < 0 || index > 8) return;

        // Copy current selection to control group
        this.controlGroups[index] = [...this.selectedUnits];

        // Emit event for UI feedback
        if (this.game.eventManager) {
            this.game.eventManager.emit('CONTROL_GROUP_SET', {
                group: groupNum,
                units: this.controlGroups[index].length
            });
        }

        console.log(`SelectionManager: Control group ${groupNum} set with ${this.selectedUnits.length} units`);
    }

    /**
     * Recall a control group (select those units)
     * @param {number} groupNum - Group number (1-9)
     * @param {boolean} addToSelection - If true, adds to current selection
     */
    recallControlGroup(groupNum, addToSelection = false) {
        const index = groupNum - 1;
        if (index < 0 || index > 8) return;

        // Remove dead units from the group
        this.controlGroups[index] = this.controlGroups[index].filter(unit =>
            unit && !unit.isDead()
        );

        const units = this.controlGroups[index];

        if (units.length > 0) {
            this.selectUnits(units, addToSelection);
        }
    }

    /**
     * Double-tap a control group to center camera on them
     * @param {number} groupNum - Group number (1-9)
     */
    focusControlGroup(groupNum) {
        const index = groupNum - 1;
        if (index < 0 || index > 8) return;

        const units = this.controlGroups[index].filter(unit =>
            unit && !unit.isDead()
        );

        if (units.length === 0) return;

        // Calculate center of group
        let centerX = 0;
        let centerY = 0;
        for (const unit of units) {
            centerX += unit.x;
            centerY += unit.y;
        }
        centerX /= units.length;
        centerY /= units.length;

        // Emit camera focus event
        if (this.game.eventManager) {
            this.game.eventManager.emit('CAMERA_FOCUS', {
                x: centerX,
                y: centerY
            });
        }
    }

    /**
     * Add units to an existing control group
     * @param {number} groupNum - Group number (1-9)
     */
    addToControlGroup(groupNum) {
        const index = groupNum - 1;
        if (index < 0 || index > 8) return;

        // Add selected units that aren't already in the group
        for (const unit of this.selectedUnits) {
            if (!this.controlGroups[index].includes(unit)) {
                this.controlGroups[index].push(unit);
            }
        }

        console.log(`SelectionManager: Added to control group ${groupNum}, now ${this.controlGroups[index].length} units`);
    }

    // ========================================
    // INPUT HANDLING
    // ========================================

    /**
     * Handle mouse press for selection
     * @param {number} x - Mouse X
     * @param {number} y - Mouse Y
     * @param {boolean} shiftHeld - Is shift key held
     * @returns {boolean} True if input was handled
     */
    handleMousePressed(x, y, shiftHeld = false) {
        // Check for double-click
        const now = millis();
        const isDoubleClick = (
            now - this.lastClickTime < this.doubleClickThreshold &&
            Math.abs(x - this.lastClickX) < this.doubleClickRadius &&
            Math.abs(y - this.lastClickY) < this.doubleClickRadius
        );

        // Update last click tracking
        this.lastClickTime = now;
        this.lastClickX = x;
        this.lastClickY = y;

        // Check if clicked on a unit
        const clickedUnit = this.getUnitAtPosition(x, y);

        if (clickedUnit) {
            // Double-click: select all of same type
            if (isDoubleClick) {
                this.selectAllOfType(clickedUnit);
                return true;
            }

            // Shift-click: toggle selection
            if (shiftHeld) {
                this.toggleUnitSelection(clickedUnit);
            } else {
                this.selectUnit(clickedUnit);
            }
            return true;
        }

        // Check if clicked on a building
        const clickedBuilding = this.getBuildingAtPosition(x, y);

        if (clickedBuilding) {
            this.selectBuilding(clickedBuilding);
            return true;
        }

        // Clicked on empty ground - clear selection and start box selection
        if (!shiftHeld) {
            this.clearSelection();
        }

        // Start box selection on empty space
        this.startBoxSelection(x, y);
        return false;
    }

    /**
     * Handle mouse drag for box selection
     * @param {number} x - Mouse X
     * @param {number} y - Mouse Y
     */
    handleMouseDragged(x, y) {
        this.updateBoxSelection(x, y);
    }

    /**
     * Handle mouse release
     * @param {number} x - Mouse X
     * @param {number} y - Mouse Y
     * @param {boolean} shiftHeld - Is shift key held
     */
    handleMouseReleased(x, y, shiftHeld = false) {
        if (this.isBoxSelecting) {
            this.finishBoxSelection(shiftHeld);
        }
    }

    /**
     * Handle right-click for commands
     * @param {number} x - Target X
     * @param {number} y - Target Y
     * @param {boolean} shiftHeld - If true, queue command instead of replacing
     * @returns {boolean} True if command was issued
     */
    handleRightClick(x, y, shiftHeld = false) {
        if (this.selectedUnits.length === 0) return false;

        // Check if clicking on enemy unit (attack command)
        const targetUnit = this.getUnitAtPosition(x, y);

        if (targetUnit && targetUnit.owner !== this.game.localPlayer) {
            this.issueAttackCommand(targetUnit, shiftHeld);
            return true;
        }

        // Issue move command to position
        this.issueMoveCommand(x, y, shiftHeld);
        return true;
    }

    /**
     * Handle keyboard input for control groups and commands
     * @param {string} key - The key pressed
     * @param {boolean} ctrlHeld - Is ctrl key held
     * @param {boolean} shiftHeld - Is shift key held
     * @returns {boolean} True if input was handled
     */
    handleKeyPressed(key, ctrlHeld = false, shiftHeld = false) {
        // Number keys for control groups
        if (key >= '1' && key <= '9') {
            const groupNum = parseInt(key);

            if (ctrlHeld) {
                // Ctrl + number: assign control group
                this.setControlGroup(groupNum);
                return true;
            } else if (shiftHeld) {
                // Shift + number: add to control group
                this.addToControlGroup(groupNum);
                return true;
            } else {
                // Just number: recall control group
                this.recallControlGroup(groupNum);
                return true;
            }
        }

        // S to stop selected units
        if (key === 's' || key === 'S') {
            this.issueStopCommand();
            return true;
        }

        // A for attack-move mode
        if (key === 'a' || key === 'A') {
            // Set attack-move cursor mode
            if (this.game.cursorManager) {
                this.game.cursorManager.setMode('attack');
            }
            return true;
        }

        // Escape to deselect
        if (key === 'Escape') {
            this.clearSelection();
            return true;
        }

        return false;
    }

    // ========================================
    // COMMAND ISSUING
    // ========================================

    /**
     * Issue move command to selected units
     * @param {number} x - Target X
     * @param {number} y - Target Y
     * @param {boolean} queue - If true, queue command
     */
    issueMoveCommand(x, y, queue = false) {
        for (const unit of this.selectedUnits) {
            if (unit && !unit.isDead() && typeof MoveCommand !== 'undefined') {
                const cmd = new MoveCommand(unit, x, y);
                unit.queueCommand(cmd, queue);
            }
        }

        // Visual feedback
        if (window.ShapeRenderer) {
            window.ShapeRenderer.drawOrderIndicator(x, y, 'move');
        }

        // Emit event
        if (this.game.eventManager) {
            this.game.eventManager.emit('COMMAND_ISSUED', {
                type: 'move',
                units: this.selectedUnits.length,
                x: x,
                y: y
            });
        }
    }

    /**
     * Issue attack command to selected units
     * @param {Unit} target - The target unit
     * @param {boolean} queue - If true, queue command
     */
    issueAttackCommand(target, queue = false) {
        for (const unit of this.selectedUnits) {
            if (unit && !unit.isDead() && typeof AttackCommand !== 'undefined') {
                const cmd = new AttackCommand(unit, target);
                unit.queueCommand(cmd, queue);
            }
        }

        // Visual feedback
        if (window.ShapeRenderer && target) {
            window.ShapeRenderer.drawOrderIndicator(target.x, target.y, 'attack');
        }

        // Emit event
        if (this.game.eventManager) {
            this.game.eventManager.emit('COMMAND_ISSUED', {
                type: 'attack',
                units: this.selectedUnits.length,
                target: target
            });
        }
    }

    /**
     * Issue stop command to selected units
     */
    issueStopCommand() {
        for (const unit of this.selectedUnits) {
            if (unit && !unit.isDead() && typeof StopCommand !== 'undefined') {
                const cmd = new StopCommand(unit);
                unit.queueCommand(cmd, false);
            }
        }

        // Emit event
        if (this.game.eventManager) {
            this.game.eventManager.emit('COMMAND_ISSUED', {
                type: 'stop',
                units: this.selectedUnits.length
            });
        }
    }

    /**
     * Issue attack-move command to selected units
     * @param {number} x - Target X
     * @param {number} y - Target Y
     * @param {boolean} queue - If true, queue command
     */
    issueAttackMoveCommand(x, y, queue = false) {
        for (const unit of this.selectedUnits) {
            if (unit && !unit.isDead() && typeof AttackMoveCommand !== 'undefined') {
                const cmd = new AttackMoveCommand(unit, x, y);
                unit.queueCommand(cmd, queue);
            }
        }

        // Visual feedback
        if (window.ShapeRenderer) {
            window.ShapeRenderer.drawOrderIndicator(x, y, 'attack');
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get unit at a screen position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Unit|null} The unit at that position or null
     */
    getUnitAtPosition(x, y) {
        const allUnits = this.getAllUnits();

        // Check in reverse order (top units first)
        for (let i = allUnits.length - 1; i >= 0; i--) {
            const unit = allUnits[i];
            if (unit && !unit.isDead() && unit.containsPoint(x, y)) {
                return unit;
            }
        }

        return null;
    }

    /**
     * Emit selection changed event
     */
    emitSelectionChanged() {
        if (this.game.eventManager) {
            this.game.eventManager.emit('SELECTION_CHANGED', {
                units: this.selectedUnits,
                count: this.selectedUnits.length,
                building: this.selectedBuilding
            });
        }
    }

    /**
     * Check if any units or buildings are selected
     * @returns {boolean}
     */
    hasSelection() {
        return this.selectedUnits.length > 0 || this.selectedBuilding !== null;
    }

    /**
     * Check if a building is selected
     * @returns {boolean}
     */
    hasBuildingSelected() {
        return this.selectedBuilding !== null;
    }

    /**
     * Get the selected building
     * @returns {Building|null}
     */
    getSelectedBuilding() {
        return this.selectedBuilding;
    }

    /**
     * Get count of selected units
     * @returns {number}
     */
    getSelectionCount() {
        return this.selectedUnits.length;
    }

    /**
     * Get the primary selected unit (first in selection)
     * @returns {Unit|null}
     */
    getPrimarySelection() {
        return this.selectedUnits[0] || null;
    }

    /**
     * Remove a unit from all tracking (called when unit dies)
     * @param {Unit} unit - The unit to remove
     */
    removeUnit(unit) {
        // Remove from selection
        this.deselectUnit(unit);

        // Remove from all control groups
        for (let i = 0; i < this.controlGroups.length; i++) {
            const index = this.controlGroups[i].indexOf(unit);
            if (index !== -1) {
                this.controlGroups[i].splice(index, 1);
            }
        }
    }

    // ========================================
    // RENDERING
    // ========================================

    /**
     * Draw selection visuals (box, indicators)
     */
    draw() {
        // Draw box selection
        if (this.isBoxSelecting) {
            const bounds = this.getBoxBounds();
            if (bounds && (bounds.w > 5 || bounds.h > 5)) {
                push();
                fill(this.boxFillColor);
                stroke(this.boxStrokeColor);
                strokeWeight(1);
                rect(bounds.x, bounds.y, bounds.w, bounds.h);
                pop();
            }
        }
    }

    /**
     * Update selection manager (remove dead units)
     */
    update() {
        // Remove dead units from selection
        this.selectedUnits = this.selectedUnits.filter(unit =>
            unit && !unit.isDead()
        );

        // Clean up control groups
        for (let i = 0; i < this.controlGroups.length; i++) {
            this.controlGroups[i] = this.controlGroups[i].filter(unit =>
                unit && !unit.isDead()
            );
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SelectionManager = SelectionManager;
}
