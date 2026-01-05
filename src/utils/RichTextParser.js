/**
 * RichTextParser.js - Parse and render formatted dialogue text
 * Supports color tags, effect tags, and per-letter animations
 *
 * Supported Tags:
 * Colors: {red}, {gold}, {blue}, {green}, {purple}, {orange}, {white}
 * Effects: {shake}, {wave}, {bounce}, {glow}, {pulse}, {rainbow}
 *
 * Example: "Beware the {red}{shake}Vampire{/shake}{/red}! He can {gold}summon minions{/gold}!"
 */

class RichTextParser {
    constructor() {
        // Supported color tags and their RGB values
        this.colors = {
            'red': [255, 80, 80],
            'gold': [255, 215, 0],
            'blue': [100, 180, 255],
            'green': [100, 255, 150],
            'purple': [200, 100, 255],
            'orange': [255, 165, 0],
            'white': [255, 255, 255],
            'yellow': [255, 255, 100],
            'cyan': [100, 255, 255],
            'pink': [255, 150, 200],
            'darkred': [180, 50, 50],
            'lime': [150, 255, 50]
        };

        // Supported effect tags
        this.effects = [
            'shake', 'wave', 'bounce', 'glow', 'pulse', 'rainbow', 'wiggle'
        ];
    }

    /**
     * Parse formatted text into segments with metadata
     * @param {string} text - Formatted text with tags
     * @returns {Array} Array of text segments with formatting info
     */
    parse(text) {
        const segments = [];
        let currentIndex = 0;
        const stack = []; // Track nested tags
        let currentSegment = {
            text: '',
            color: null,
            effects: []
        };

        while (currentIndex < text.length) {
            // Check for opening tag
            if (text[currentIndex] === '{') {
                let tagEnd = text.indexOf('}', currentIndex);
                if (tagEnd !== -1) {
                    let tagName = text.slice(currentIndex + 1, tagEnd);

                    // Check if it's a closing tag
                    if (tagName.startsWith('/')) {
                        let closingTag = tagName.slice(1);

                        // Save current segment if it has text
                        if (currentSegment.text.length > 0) {
                            segments.push({ ...currentSegment });
                        }

                        // Pop from stack
                        let poppedIndex = stack.lastIndexOf(closingTag);
                        if (poppedIndex !== -1) {
                            stack.splice(poppedIndex, 1);
                        }

                        // Reset segment with remaining stack state
                        currentSegment = {
                            text: '',
                            color: null,
                            effects: []
                        };

                        // Reapply remaining stack tags
                        for (let tag of stack) {
                            if (this.colors[tag]) {
                                currentSegment.color = tag;
                            } else if (this.effects.includes(tag)) {
                                if (!currentSegment.effects.includes(tag)) {
                                    currentSegment.effects.push(tag);
                                }
                            }
                        }

                        currentIndex = tagEnd + 1;
                        continue;
                    }

                    // Opening tag
                    // Save current segment if format is changing
                    if (currentSegment.text.length > 0) {
                        segments.push({ ...currentSegment });
                        currentSegment = {
                            text: '',
                            color: currentSegment.color,
                            effects: [...currentSegment.effects]
                        };
                    }

                    // Apply new tag
                    if (this.colors[tagName]) {
                        currentSegment.color = tagName;
                        stack.push(tagName);
                    } else if (this.effects.includes(tagName)) {
                        if (!currentSegment.effects.includes(tagName)) {
                            currentSegment.effects.push(tagName);
                        }
                        stack.push(tagName);
                    }

                    currentIndex = tagEnd + 1;
                    continue;
                }
            }

            // Regular character
            currentSegment.text += text[currentIndex];
            currentIndex++;
        }

        // Add final segment
        if (currentSegment.text.length > 0) {
            segments.push(currentSegment);
        }

        return segments;
    }

    /**
     * Get color array from color name
     * @param {string} colorName - Color tag name
     * @returns {Array} [r, g, b] array
     */
    getColor(colorName) {
        return this.colors[colorName] || [255, 255, 255];
    }

    /**
     * Apply effect animation to letter position
     * @param {string} effect - Effect name
     * @param {number} letterIndex - Index of letter in segment
     * @param {number} globalTime - Global frame counter
     * @returns {object} { offsetX, offsetY, scaleX, scaleY, rotation, alpha }
     */
    applyEffect(effect, letterIndex, globalTime) {
        const result = {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            alpha: 1
        };

        // Safe access to p5.js functions with fallbacks
        const _random = (min, max) => {
            if (typeof random !== 'undefined') {
                return random(min, max);
            }
            return Math.random() * (max - min) + min;
        };
        const _sin = typeof sin !== 'undefined' ? sin : Math.sin;
        const _abs = typeof abs !== 'undefined' ? abs : Math.abs;

        switch (effect) {
            case 'shake':
                // Random jitter (75% intensity)
                result.offsetX = _random(-1.5, 1.5);
                result.offsetY = _random(-1.5, 1.5);
                break;

            case 'wave':
                // Vertical sine wave
                result.offsetY = _sin(globalTime * 0.1 + letterIndex * 0.5) * 4;
                break;

            case 'bounce':
                // Bouncing motion
                result.offsetY = _abs(_sin(globalTime * 0.15 + letterIndex * 0.3)) * -6;
                break;

            case 'glow':
                // Pulsing alpha
                result.alpha = 0.7 + _sin(globalTime * 0.1 + letterIndex * 0.2) * 0.3;
                break;

            case 'pulse':
                // Scale pulsing
                let scale = 1 + _sin(globalTime * 0.12 + letterIndex * 0.25) * 0.15;
                result.scaleX = scale;
                result.scaleY = scale;
                break;

            case 'wiggle':
                // Rotation wiggle
                result.rotation = _sin(globalTime * 0.15 + letterIndex * 0.4) * 0.15;
                break;

            case 'rainbow':
                // Color cycling handled separately in rendering
                break;
        }

        return result;
    }

    /**
     * Get rainbow color for a letter
     * @param {number} letterIndex - Index of letter
     * @param {number} globalTime - Global frame counter
     * @returns {Array} [r, g, b]
     */
    getRainbowColor(letterIndex, globalTime) {
        let hue = (globalTime * 2 + letterIndex * 20) % 360;
        return this.hsvToRgb(hue, 100, 100);
    }

    /**
     * Get segment color (handles rainbow and regular colors)
     * @param {Object} segment - Text segment
     * @param {number} letterIndex - Index of letter
     * @param {number} frameCount - Global frame counter
     * @returns {Object} p5.js color object
     */
    getSegmentColor(segment, letterIndex, frameCount) {
        if (segment.effects.includes('rainbow')) {
            let rainbowRGB = this.getRainbowColor(letterIndex, frameCount);
            return typeof color !== 'undefined' ? color(rainbowRGB[0], rainbowRGB[1], rainbowRGB[2]) : rainbowRGB;
        } else if (segment.color) {
            let rgb = this.getColor(segment.color);
            return typeof color !== 'undefined' ? color(rgb[0], rgb[1], rgb[2]) : rgb;
        } else {
            return typeof color !== 'undefined' ? color(255) : [255, 255, 255];
        }
    }

    /**
     * Combine multiple effects into a single transform
     * @param {Array} effects - Array of effect names
     * @param {number} letterIndex - Index of letter
     * @param {number} frameCount - Global frame counter
     * @returns {Object} Combined transform
     */
    combineEffects(effects, letterIndex, frameCount) {
        let transform = {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            alpha: 1
        };

        for (let effect of effects) {
            if (effect === 'rainbow') continue; // Already handled in color

            let effectTransform = this.applyEffect(effect, letterIndex, frameCount);
            transform.offsetX += effectTransform.offsetX;
            transform.offsetY += effectTransform.offsetY;
            transform.scaleX *= effectTransform.scaleX;
            transform.scaleY *= effectTransform.scaleY;
            transform.rotation += effectTransform.rotation;
            transform.alpha *= effectTransform.alpha;
        }

        return transform;
    }

    /**
     * Render parsed rich text with effects
     * @param {Array} characterSegmentMap - Pre-parsed character map
     * @param {Array} textSegments - Pre-parsed text segments
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} maxWidth - Maximum width for wrapping
     * @param {number} maxHeight - Maximum height
     * @param {number} fontSize - Font size to use
     * @param {number} maxChars - Maximum characters to render (optional, for typewriter effect)
     */
    render(characterSegmentMap, textSegments, startX, startY, maxWidth, maxHeight, fontSize, maxChars = -1) {
        if (characterSegmentMap.length === 0) return;

        // Limit characters if specified (for typewriter effect)
        let charsToRender = maxChars > 0 ? Math.min(maxChars, characterSegmentMap.length) : characterSegmentMap.length;

        if (typeof push === 'undefined' || typeof pop === 'undefined') {
            console.warn('RichTextParser.render: p5.js drawing functions not available');
            return;
        }

        push();
        if (typeof textAlign !== 'undefined') textAlign(LEFT, TOP);
        if (typeof textSize !== 'undefined') textSize(fontSize);

        let x = startX;
        let y = startY;
        let lineHeight = fontSize * 1.375; // 22px for 16px font
        let spaceWidth = typeof textWidth !== 'undefined' ? textWidth(' ') : fontSize * 0.5;

        for (let i = 0; i < charsToRender; i++) {
            let charData = characterSegmentMap[i];
            if (!charData) continue;

            let segment = textSegments[charData.segmentIndex];
            let char = charData.char;

            // Handle newlines
            if (char === '\n') {
                x = startX;
                y += lineHeight;
                continue;
            }

            // Measure character width
            let charWidth = typeof textWidth !== 'undefined' ? textWidth(char) : fontSize * 0.6;

            // Handle word wrapping (check if we're at the start of a word)
            if (x !== startX && char !== ' ' && (i === 0 || characterSegmentMap[i - 1].char === ' ')) {
                // We're at the start of a new word, calculate word width
                let wordWidth = 0;
                let j = i;
                while (j < charsToRender && characterSegmentMap[j].char !== ' ' && characterSegmentMap[j].char !== '\n') {
                    let wordChar = characterSegmentMap[j].char;
                    wordWidth += typeof textWidth !== 'undefined' ? textWidth(wordChar) : fontSize * 0.6;
                    j++;
                }

                // If word doesn't fit on current line, wrap to next line
                if (x + wordWidth > startX + maxWidth) {
                    x = startX;
                    y += lineHeight;
                }
            }

            // Skip if we've exceeded max height
            if (y + lineHeight > startY + maxHeight) {
                break;
            }

            // Get base color from segment
            let baseColor = this.getSegmentColor(segment, charData.letterIndex, frameCount);

            // Apply effects to get transformations
            let transform = this.combineEffects(segment.effects, charData.letterIndex, frameCount);

            // Apply transformations and render character
            push();
            if (typeof translate !== 'undefined') translate(x + charWidth / 2, y + lineHeight / 2);
            if (typeof rotate !== 'undefined') rotate(transform.rotation);
            if (typeof scale !== 'undefined') scale(transform.scaleX, transform.scaleY);
            if (typeof translate !== 'undefined') translate(transform.offsetX, transform.offsetY);

            // Apply color with alpha
            if (typeof fill !== 'undefined') {
                if (Array.isArray(baseColor)) {
                    fill(baseColor[0], baseColor[1], baseColor[2], 255 * transform.alpha);
                } else {
                    let r = typeof red !== 'undefined' ? red(baseColor) : 255;
                    let g = typeof green !== 'undefined' ? green(baseColor) : 255;
                    let b = typeof blue !== 'undefined' ? blue(baseColor) : 255;
                    fill(r, g, b, 255 * transform.alpha);
                }
            }
            if (typeof noStroke !== 'undefined') noStroke();
            if (typeof textAlign !== 'undefined') textAlign(CENTER, CENTER);
            if (typeof textSize !== 'undefined') textSize(fontSize);
            if (typeof text !== 'undefined') text(char, 0, 0);
            pop();

            // Move to next character position
            x += charWidth;
        }

        pop();
    }

    /**
     * Convert HSV to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} v - Value (0-100)
     * @returns {Array} [r, g, b]
     */
    hsvToRgb(h, s, v) {
        s = s / 100;
        v = v / 100;
        let c = v * s;
        let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        let m = v - c;
        let r, g, b;

        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.RICH_TEXT_PARSER = new RichTextParser();
}
