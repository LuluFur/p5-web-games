// DialogueManager.js - Handles dialogue/intro sequences
class DialogueManager {
    constructor(game) {
        this.game = game;
        this.dialogueData = null;
        this.dialogueDummy = null;
        this.startFrame = 0;
        this.active = false;
        this.lastCharCount = 0; // Track typewriter progress for sound
        this.textSegments = []; // Parsed rich text segments
        this.characterSegmentMap = []; // Maps each character index to its segment
    }

    // Sanitize dialogue text to prevent potential issues
    sanitizeDialogueData(dialogueData) {
        if (!dialogueData) return null;

        const sanitized = { ...dialogueData };

        // Allowed rich text tags (whitelist)
        const allowedTags = ['red', 'gold', 'blue', 'green', 'purple', 'orange', 'white',
                             'yellow', 'cyan', 'pink', 'darkred', 'lime',
                             'shake', 'wave', 'bounce', 'glow', 'pulse', 'rainbow', 'wiggle'];

        // Sanitize title (remove ALL HTML, remove stray brackets, limit length)
        if (sanitized.title) {
            sanitized.title = String(sanitized.title)
                .replace(/<[^>]*>/g, '') // Remove ALL HTML
                .replace(/[<>]/g, '') // Remove stray brackets
                .slice(0, 100);
        }

        // Sanitize text (whitelist approach for rich text tags)
        if (sanitized.text) {
            let safeText = String(sanitized.text)
                .replace(/<[^>]*>/g, '') // Remove ALL HTML first
                .replace(/[<>]/g, ''); // Remove stray brackets

            // Validate rich text tags match allowed pattern
            safeText = safeText.replace(/\{[^}]*\}/g, (match) => {
                // Extract tag name (handle both opening and closing tags)
                let tagName = match.slice(1, -1); // Remove { and }
                if (tagName.startsWith('/')) {
                    tagName = tagName.slice(1); // Remove /
                }

                // Only allow whitelisted tags
                return allowedTags.includes(tagName) ? match : '';
            });

            sanitized.text = safeText.slice(0, 500);
        }

        // Validate type (whitelist allowed enemy types)
        const allowedTypes = ['zombie', 'vampire', 'skeleton', 'wraith', 'goblin', 'ogre', 'necromancer', 'ghost', 'slime', 'wolf', 'golem', 'swarm', 'regenerator'];
        if (sanitized.type && !allowedTypes.includes(sanitized.type)) {
            sanitized.type = 'zombie'; // Default to zombie if invalid type
        }

        return sanitized;
    }

    /**
     * Parse rich text into segments and build character mapping
     * @param {string} text - Text with rich text formatting tags
     */
    parseRichText(text) {
        this.textSegments = [];
        this.characterSegmentMap = [];

        // If RichTextParser is available, use it
        if (typeof RICH_TEXT_PARSER !== 'undefined') {
            this.textSegments = RICH_TEXT_PARSER.parse(text);
        } else {
            // Fallback: treat entire text as single segment
            this.textSegments = [{ text: text, color: null, effects: [] }];
        }

        // Build character-to-segment map
        let charIndex = 0;
        for (let segmentIndex = 0; segmentIndex < this.textSegments.length; segmentIndex++) {
            let segment = this.textSegments[segmentIndex];
            for (let i = 0; i < segment.text.length; i++) {
                this.characterSegmentMap[charIndex] = {
                    segmentIndex: segmentIndex,
                    letterIndex: i,
                    char: segment.text[i]
                };
                charIndex++;
            }
        }
    }

    /**
     * Start a dialogue sequence with rich text formatting
     * @param {Object} dialogueData - Dialogue configuration
     * @param {string} dialogueData.title - Dialogue title
     * @param {string} dialogueData.text - Rich text content with formatting tags
     * @param {string} dialogueData.type - Enemy type for visualization
     */
    start(dialogueData) {
        // Sanitize input data
        this.dialogueData = this.sanitizeDialogueData(dialogueData);
        if (!this.dialogueData) return; // Exit if data is invalid

        this.startFrame = frameCount;
        this.active = true;
        this.lastCharCount = 0; // Reset typewriter sound tracking

        // Parse rich text formatting
        this.parseRichText(this.dialogueData.text);

        // Create dummy enemy for visualization
        let type = this.dialogueData.type || 'zombie';
        let dummyPath = [{ c: 0, r: 0 }, { c: 0, r: 0 }];

        this.dialogueDummy = this.createDummy(type, dummyPath);
        this.dialogueDummy.active = true;
        this.dialogueDummy.state = 'WALK';
        this.dialogueDummy.isPreview = true;

        this.game.setState(GameState.DIALOGUE);
    }

    // Factory for dummy enemies
    createDummy(type, path) {
        // Try to create specific enemy class if it exists
        try {
            switch (type) {
                case 'vampire': return typeof Vampire !== 'undefined' ? new Vampire(path) : new Enemy(path);
                case 'skeleton': return typeof Skeleton !== 'undefined' ? new Skeleton(path) : new Enemy(path);
                case 'wraith': return typeof Wraith !== 'undefined' ? new Wraith(path) : new Enemy(path);
                case 'goblin': return typeof Goblin !== 'undefined' ? new Goblin(path) : new Enemy(path);
                case 'ogre': return typeof Ogre !== 'undefined' ? new Ogre(path) : new Enemy(path);
                case 'necromancer': return typeof Necromancer !== 'undefined' ? new Necromancer(path) : new Enemy(path);
                case 'golem': return typeof Golem !== 'undefined' ? new Golem(path) : new Enemy(path);
                case 'ghost': return typeof Ghost !== 'undefined' ? new Ghost(path) : new Enemy(path);
                case 'slime': return typeof Slime !== 'undefined' ? new Slime(path) : new Enemy(path);
                case 'wolf': return typeof Wolf !== 'undefined' ? new Wolf(path) : new Enemy(path);
                case 'swarm':
                case 'regenerator':
                default: return new Enemy(path);
            }
        } catch (e) {
            console.warn(`Failed to create ${type} dummy, falling back to Enemy`, e);
            return new Enemy(path);
        }
    }

    // Render rich text with per-letter effects (uses shared RichTextParser.render)
    renderRichText(charsToShow, startX, startY, maxWidth, maxHeight) {
        if (typeof RICH_TEXT_PARSER !== 'undefined' && this.characterSegmentMap.length > 0) {
            RICH_TEXT_PARSER.render(this.characterSegmentMap, this.textSegments, startX, startY, maxWidth, maxHeight, 18, charsToShow);
        }
    }

    // Handle click to dismiss dialogue
    handleClick() {
        if (!this.active) return false;

        // Get layout (same as draw method)
        let layout;
        if (typeof UI_HELPER !== 'undefined') {
            layout = UI_HELPER.getDialogueLayout(true);
        } else {
            let boxH = 260;
            let boxY = height - boxH - 20;
            let boxX = width / 2;
            layout = {
                buttons: {
                    y: boxY + boxH - 50,
                    left: { x: boxX - 200 },
                    right: { x: boxX + 200 }
                }
            };
        }

        let startBtnX = layout.buttons.right.x;
        let startBtnY = layout.buttons.y;
        let startBtnW = 180;
        let startBtnH = 40;

        let continueBtnX = layout.buttons.left.x;
        let continueBtnY = layout.buttons.y;
        let continueBtnW = 180;
        let continueBtnH = 40;

        let clickedStartWave = false;

        // Check Start Wave button
        if (mouseX >= startBtnX - startBtnW/2 && mouseX <= startBtnX + startBtnW/2 &&
            mouseY >= startBtnY - startBtnH/2 && mouseY <= startBtnY + startBtnH/2) {
            clickedStartWave = true;
        }

        // Check Continue Building button
        let clickedContinue = false;
        if (mouseX >= continueBtnX - continueBtnW/2 && mouseX <= continueBtnX + continueBtnW/2 &&
            mouseY >= continueBtnY - continueBtnH/2 && mouseY <= continueBtnY + continueBtnH/2) {
            clickedContinue = true;
        }

        // If clicked outside buttons, ignore
        if (!clickedStartWave && !clickedContinue) {
            return false;
        }

        // Dismiss dialogue
        this.active = false;
        this.dialogueData = null;
        this.dialogueDummy = null;
        this.game.setState(GameState.PLAY);

        // Only start wave if Start Wave was clicked
        if (clickedStartWave && this.game.waveManager) {
            this.game.waveManager.internalStartWave();
        }

        return true; // Consumed the click
    }

    // Draw dialogue UI
    draw() {
        if (!this.active || !this.dialogueData) return;

        // Dim background
        fill(0, 150);
        noStroke();
        rect(0, 0, width, height);

        // Get layout from UIHelper if available, otherwise use manual positioning
        let layout;
        if (typeof UI_HELPER !== 'undefined') {
            layout = UI_HELPER.getDialogueLayout(true); // true = has buttons
        } else {
            // Fallback to manual positioning
            let boxH = 260;
            let boxY = height - boxH - 20;
            let boxX = width / 2;
            layout = {
                box: { x: boxX, y: boxY, w: 800, h: boxH },
                title: { x: boxX - 200, y: boxY + 20 },
                text: { x: boxX - 200, y: boxY + 60, w: 550, h: 110 },
                buttons: {
                    y: boxY + boxH - 50,
                    left: { x: boxX - 200 },
                    right: { x: boxX + 200 }
                }
            };
        }

        let boxX = layout.box.x;
        let boxY = layout.box.y;

        // Draw box
        push();
        rectMode(CENTER);
        fill(20, 20, 30, 240);
        stroke(100, 100, 200);
        strokeWeight(4);
        rect(layout.box.x, layout.box.y + layout.box.h / 2, layout.box.w, layout.box.h, 20);
        pop();

        // Draw spinning sprite
        if (this.dialogueDummy) {
            let spriteX = boxX - 300;
            let spriteY = boxY + layout.box.h / 2;

            this.dialogueDummy.x = spriteX;
            this.dialogueDummy.y = spriteY;
            this.dialogueDummy.facingAngle += 0.05;
            this.dialogueDummy.draw();
        }

        // Draw text
        push();
        rectMode(CORNER);
        noStroke();
        textAlign(LEFT, TOP);

        // Title
        fill(255, 215, 0);
        textSize(32);
        text(this.dialogueData.title, layout.title.x, layout.title.y);

        // Body (Typewriter effect with rich text)
        textSize(18);
        textLeading(24);

        let totalChars = this.characterSegmentMap.length;
        let charsPerFrame = 0.5;
        let elapsedFrames = frameCount - this.startFrame;
        let visibleCharCount = min(totalChars, floor(elapsedFrames * charsPerFrame));

        // Play letter sound when new character appears
        if (visibleCharCount > this.lastCharCount && visibleCharCount < totalChars) {
            this.lastCharCount = visibleCharCount;

            // Explicit bounds check
            if (visibleCharCount > 0 && visibleCharCount <= this.characterSegmentMap.length) {
                let charData = this.characterSegmentMap[visibleCharCount - 1];
                if (charData && charData.char !== ' ' && typeof window.Sounds !== 'undefined') {
                    window.Sounds.play('text_letter');
                }
            }
        }

        // Render each character individually with formatting
        this.renderRichText(visibleCharCount, layout.text.x, layout.text.y, layout.text.w, layout.text.h);

        // Draw buttons
        let btnY = layout.buttons.y;
        let btnW = 180;
        let btnH = 40;

        // Continue Building button (blue, left)
        let continueBtnX = layout.buttons.left.x;
        let isHoverContinue = (mouseX >= continueBtnX - btnW/2 && mouseX <= continueBtnX + btnW/2 &&
                               mouseY >= btnY - btnH/2 && mouseY <= btnY + btnH/2);

        push();
        rectMode(CENTER);
        fill(isHoverContinue ? color(60, 120, 180) : color(40, 80, 140));
        stroke(100, 150, 255);
        strokeWeight(2);
        rect(continueBtnX, btnY, btnW, btnH, 8);

        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(18);
        text("CONTINUE BUILDING", continueBtnX, btnY);
        pop();

        // Start Wave button (green, right)
        let startBtnX = layout.buttons.right.x;
        let isHoverStart = (mouseX >= startBtnX - btnW/2 && mouseX <= startBtnX + btnW/2 &&
                            mouseY >= btnY - btnH/2 && mouseY <= btnY + btnH/2);

        push();
        rectMode(CENTER);
        fill(isHoverStart ? color(0, 200, 0) : color(0, 150, 0));
        stroke(0, 255, 0);
        strokeWeight(2);
        rect(startBtnX, btnY, btnW, btnH, 8);

        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(18);
        text("START WAVE ►", startBtnX, btnY);
        pop();

        pop();
    }
}
