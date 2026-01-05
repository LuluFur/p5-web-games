/**
 * TextAnimator.js - Animates text with per-letter effects
 * Each letter slides up individually from left to right, then slides down to disappear
 */

class TextAnimator {
    constructor() {
        this.activeAnimations = [];
    }

    /**
     * Start a new text animation
     * @param {string} text - Text to animate
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center)
     * @param {number} duration - Total duration in frames
     * @param {object} options - { size, color, letterDelay, slideDistance, soundType, startDelay }
     */
    show(text, x, y, duration, options = {}) {
        let anim = {
            text: text,
            x: x,
            y: y,
            startFrame: frameCount,
            duration: duration,
            size: options.size || 48,
            fillColor: options.color || color(255, 255, 255),
            glowColor: options.glowColor || color(255, 215, 0),
            letterDelay: options.letterDelay || 3, // Frames between each letter appearing
            slideDistance: options.slideDistance || 30, // Pixels to slide
            slideSpeed: options.slideSpeed || 10, // Frames to complete slide
            soundType: options.soundType || 'text_announce', // Sound to play per letter
            startDelay: options.startDelay || 0, // Frames to wait before starting animation
            playDisappearSound: options.playDisappearSound || false, // Play sound on disappear
            letterSoundPlayed: [], // Track which letters have played appear sounds
            letterDisappearSoundPlayed: [] // Track which letters have played disappear sounds
        };

        this.activeAnimations.push(anim);
        return anim;
    }

    /**
     * Update and draw all active animations
     */
    draw() {
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            let anim = this.activeAnimations[i];
            let elapsed = frameCount - anim.startFrame;

            // Remove finished animations
            if (elapsed > anim.duration) {
                this.activeAnimations.splice(i, 1);
                continue;
            }

            this.drawAnimation(anim, elapsed);
        }
    }

    /**
     * Draw a single text animation with per-letter effects
     */
    drawAnimation(anim, elapsed) {
        // Apply start delay
        if (elapsed < anim.startDelay) {
            return; // Don't draw anything during delay
        }

        // Adjust elapsed time to account for delay
        elapsed -= anim.startDelay;

        push();
        textAlign(CENTER, CENTER);
        textSize(anim.size);
        textStyle(BOLD);

        let letters = anim.text.split('');
        let totalLetters = letters.length;

        // Calculate total width for centering
        let totalWidth = textWidth(anim.text);
        let startX = anim.x - totalWidth / 2;

        // Phase durations (use duration minus delay for phase calculations)
        let animDuration = anim.duration - anim.startDelay;
        let appearPhase = totalLetters * anim.letterDelay + anim.slideSpeed;
        let stablePhase = animDuration - appearPhase * 2;
        let disappearStart = appearPhase + stablePhase;

        for (let i = 0; i < letters.length; i++) {
            let letter = letters[i];
            let letterWidth = textWidth(letter);

            // Calculate letter position
            let letterX = startX;
            for (let j = 0; j < i; j++) {
                letterX += textWidth(letters[j]);
            }
            letterX += letterWidth / 2;

            // Letter appearance timing
            let letterAppearStart = i * anim.letterDelay;
            let letterAppearEnd = letterAppearStart + anim.slideSpeed;

            // Letter disappearance timing
            let letterDisappearStart = disappearStart + (i * anim.letterDelay);
            let letterDisappearEnd = letterDisappearStart + anim.slideSpeed;

            let yOffset = 0;
            let alpha = 255;

            // APPEAR PHASE: Slide up from below
            if (elapsed >= letterAppearStart && elapsed < letterAppearEnd) {
                // Play letter sound on first frame it appears
                if (!anim.letterSoundPlayed[i] && elapsed === letterAppearStart) {
                    anim.letterSoundPlayed[i] = true;
                    if (window.Sounds && anim.soundType) {
                        window.Sounds.play(anim.soundType);
                    }
                }

                let progress = (elapsed - letterAppearStart) / anim.slideSpeed;
                progress = this.easeOutCubic(progress);
                yOffset = anim.slideDistance * (1 - progress);
                alpha = progress * 255;
            }
            // STABLE PHASE: Fully visible
            else if (elapsed >= letterAppearEnd && elapsed < letterDisappearStart) {
                yOffset = 0;
                alpha = 255;
            }
            // DISAPPEAR PHASE: Slide down
            else if (elapsed >= letterDisappearStart && elapsed < letterDisappearEnd) {
                // Play letter disappear sound on first frame it starts disappearing
                if (anim.playDisappearSound && !anim.letterDisappearSoundPlayed[i] && elapsed === letterDisappearStart) {
                    anim.letterDisappearSoundPlayed[i] = true;
                    if (window.Sounds && anim.soundType) {
                        window.Sounds.play(anim.soundType);
                    }
                }

                let progress = (elapsed - letterDisappearStart) / anim.slideSpeed;
                progress = this.easeInCubic(progress);
                yOffset = anim.slideDistance * progress;
                alpha = (1 - progress) * 255;
            }
            // NOT YET APPEARED or ALREADY DISAPPEARED
            else {
                continue; // Don't draw
            }

            let letterY = anim.y + yOffset;

            // Draw letter with glow
            this.drawLetterWithGlow(letter, letterX, letterY, anim.fillColor, anim.glowColor, alpha);
        }

        pop();
    }

    /**
     * Draw a single letter with glow effect
     */
    drawLetterWithGlow(letter, x, y, fillCol, glowCol, alpha) {
        // Glow (4-direction)
        fill(red(glowCol), green(glowCol), blue(glowCol), alpha * 0.4);
        text(letter, x - 2, y - 2);
        text(letter, x + 2, y - 2);
        text(letter, x - 2, y + 2);
        text(letter, x + 2, y + 2);

        // Main letter
        fill(red(fillCol), green(fillCol), blue(fillCol), alpha);
        text(letter, x, y);
    }

    /**
     * Easing functions for smooth motion
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInCubic(t) {
        return t * t * t;
    }

    /**
     * Clear all active animations
     */
    clear() {
        this.activeAnimations = [];
    }

    /**
     * Check if any animations are active
     */
    get hasActiveAnimations() {
        return this.activeAnimations.length > 0;
    }

    /**
     * Calculate optimal duration based on text length
     * @param {string} text - The text to display
     * @param {object} options - Animation options (letterDelay, slideSpeed)
     * @returns {number} Recommended duration in frames
     */
    static calculateDuration(text, options = {}) {
        let letterDelay = options.letterDelay || 2;
        let slideSpeed = options.slideSpeed || 10;
        let readingSpeed = options.readingSpeed || 4; // Frames per character reading time

        let letterCount = text.length;

        // Duration breakdown:
        // 1. Appear phase: time for all letters to cascade + slide animation
        let appearPhase = (letterCount * letterDelay) + slideSpeed;

        // 2. Reading phase: comfortable reading time
        let readingPhase = letterCount * readingSpeed;

        // 3. Disappear phase: same as appear phase
        let disappearPhase = (letterCount * letterDelay) + slideSpeed;

        // Add small buffer
        let buffer = 30;

        return appearPhase + readingPhase + disappearPhase + buffer;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.TEXT_ANIMATOR = new TextAnimator();
}
