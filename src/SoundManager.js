class SoundManager {
    constructor() {
        this.enabled = false;
        this.initialized = false;
        this.masterVolume = 0.5;

        // Presets: Define sound characteristics (volumes reduced by 25%)
        this.presets = {
            // Combat SFX
            'shoot': { type: 'triangle', freq: 600, attack: 0.01, decay: 0.05, vol: 0.0375, slide: 0 },
            'hit': { type: 'sine', freq: 150, attack: 0.01, decay: 0.1, vol: 0.075, slide: -50 },
            'enemy_death': { type: 'triangle', freq: 300, attack: 0.01, decay: 0.2, vol: 0.06, slide: -150 },

            // Building SFX
            'build': { type: 'sine', freq: 523.25, attack: 0.01, decay: 0.3, vol: 0.15, slide: 0 },
            'upgrade': { type: 'sine', freq: 659, attack: 0.02, decay: 0.4, vol: 0.1125, slide: 200 },
            'sell': { type: 'triangle', freq: 400, attack: 0.01, decay: 0.15, vol: 0.075, slide: -100 },

            // Economy SFX
            'gold_earned': { type: 'sine', freq: 1318, attack: 0.01, decay: 0.08, vol: 0.03, slide: 0 },

            // Enemy Spawn SFX (Unique per type)
            'spawn_zombie': { type: 'sine', freq: 80, attack: 0.05, decay: 0.3, vol: 0.06, slide: 20 },
            'spawn_vampire': { type: 'triangle', freq: 150, attack: 0.1, decay: 0.4, vol: 0.075, slide: -30 },
            'spawn_skeleton': { type: 'triangle', freq: 200, attack: 0.02, decay: 0.15, vol: 0.045, slide: 50 },
            'spawn_wraith': { type: 'sine', freq: 400, attack: 0.15, decay: 0.5, vol: 0.0375, slide: -100 },
            'spawn_goblin': { type: 'triangle', freq: 500, attack: 0.01, decay: 0.1, vol: 0.0525, slide: 80 },
            'spawn_ogre': { type: 'sine', freq: 60, attack: 0.1, decay: 0.5, vol: 0.09, slide: -10 },

            // UI/Wave SFX
            'gameover': { type: 'triangle', freq: 200, attack: 0.1, decay: 1.5, vol: 0.15, slide: -100 },
            'summon': { type: 'sawtooth', freq: 150, attack: 0.05, decay: 0.3, vol: 0.075, slide: 20 },
            'vampire_summon': { type: 'triangle', freq: 220, attack: 0.1, decay: 0.5, vol: 0.1125, slide: -10 },
            'wave_start': { type: 'sine', freq: 523.25, attack: 0.1, decay: 1.0, vol: 0.15, slide: 261.63 },
            'wave_end': { type: 'sine', freq: 523.25, attack: 0.1, decay: 1.0, vol: 0.15, slide: -130.8 },
            'error': { type: 'sawtooth', freq: 100, attack: 0.01, decay: 0.1, vol: 0.075, slide: 0 },

            // Text/Typography SFX
            'text_letter': { type: 'sine', freq: 220, attack: 0.005, decay: 0.04, vol: 0.045, slide: 0 },      // Dialogue text
            'text_announce': { type: 'sine', freq: 440, attack: 0.005, decay: 0.05, vol: 0.06, slide: 10 }    // Announcement text
        };

        this.bgmInterval = null;
        this.step = 0;
        this.musicState = 'idle'; // 'idle', 'wave', or 'victory'
        this.victoryTimeout = null; // Track victory music timeout

        // ═══════════════════════════════════════════════════════════════
        // ADVANCED MUSIC ENGINE - Proper Music Theory Implementation
        // ═══════════════════════════════════════════════════════════════

        // Chord Progression: I - V - vi - IV (The "Axis" Progression)
        // In C Major: C - G - Am - F
        // Each chord defined by root semitone offset and type
        this.chords = [
            { root: 0, type: 'major' },   // I  - C
            { root: 7, type: 'major' },   // V  - G  
            { root: 9, type: 'minor' },   // vi - Am
            { root: 5, type: 'major' }    // IV - F
        ];

        // Scale degrees for melodic patterns (C Major Pentatonic for safety)
        this.pentatonic = [0, 2, 4, 7, 9]; // C D E G A

        // Rhythm patterns (1 = hit, 0 = rest)
        this.rhythms = {
            kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            bass: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
        };

        // Melodic phrases (scale degree offsets, -1 = rest)
        this.melodies = {
            idle: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            wave: [0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 4, -1, 2, -1, 0, -1],
            victory: [0, 2, 4, 7, 9, -1, 7, 4, 9, -1, 7, 4, 9, 7, 9, -1] // Triumphant ascending melody
        };
    }

    init() {
        if (this.initialized) return;

        try {
            // Check if p5.sound is available
            if (typeof p5 !== 'undefined' && typeof p5.Oscillator !== 'undefined') {
                this.enabled = true;
                console.log("🎹 Advanced Music Engine Online");

                // Initialize audio context
                if (typeof userStartAudio !== 'undefined') {
                    userStartAudio();
                }

                // Start music after a short delay to ensure audio context is ready
                setTimeout(() => {
                    if (this.enabled) {
                        this.startMusic();
                    }
                }, 100);
            } else {
                console.warn("🎹 p5.sound not available, music disabled");
                this.enabled = false;
            }
        } catch (e) {
            console.warn("🎹 Sound initialization failed:", e.message);
            this.enabled = false;
        }

        // Setup event-driven sound system
        this.setupEventListeners();

        this.initialized = true;
    }

    /**
     * Setup event listeners for game events
     * Makes SoundManager fully event-driven
     */
    setupEventListeners() {
        if (typeof EVENTS === 'undefined') {
            console.warn('SoundManager: EventManager not available, skipping event listeners');
            return;
        }

        // Wave events
        EVENTS.on(EVENT_NAMES.WAVE_START, (data) => {
            this.play('wave_start');
            this.setMusicState('wave');
            console.log(`🎵 SoundManager: Wave ${data.wave} started`);
        });

        EVENTS.on(EVENT_NAMES.WAVE_COMPLETE, (data) => {
            this.play('wave_end');
            this.setMusicState('idle');
            console.log(`🎵 SoundManager: Wave ${data.wave} completed`);
        });

        // Territory unlocks
        EVENTS.on(EVENT_NAMES.TERRITORY_UNLOCK, (data) => {
            this.play('wave_end', 0.3);
            console.log(`🎵 SoundManager: Territory unlocked (row ${data.row})`);
        });

        // Enemy events
        EVENTS.on(EVENT_NAMES.ENEMY_SPAWN, (data) => {
            this.play('spawn_' + data.type, 0.15);
        });

        // Tower events
        EVENTS.on(EVENT_NAMES.TOWER_PLACE, (data) => {
            this.play('build');
        });

        EVENTS.on(EVENT_NAMES.TOWER_SELL, (data) => {
            this.play('sell');
        });

        // Economy events
        EVENTS.on(EVENT_NAMES.GOLD_GAIN, (data) => {
            if (data.amount > 0) {
                this.play('gold_earned', 0.05);
            }
        });

        EVENTS.on(EVENT_NAMES.LIFE_LOST, (data) => {
            // Speed up music on damage
            let newTempo = 120 + ((20 - data.remaining) * 1);
            if (newTempo > 200) newTempo = 200;
            this.setTempo(newTempo);
        });

        EVENTS.on(EVENT_NAMES.GAME_OVER, (data) => {
            this.play('gameover');
            // Tape Stop Effect
            let t = 120;
            let slowDown = setInterval(() => {
                t -= 10;
                if (t <= 40) {
                    clearInterval(slowDown);
                    this.stopMusic();
                } else {
                    this.setTempo(t);
                }
            }, 200);
            console.log(`🎵 SoundManager: Game Over at wave ${data.wave}`);
        });

        // State change events (for victory music on level complete)
        EVENTS.on(EVENT_NAMES.STATE_CHANGE, (data) => {
            if (data.newState === 'LEVEL_COMPLETE') {
                // Play victory fanfare sound
                this.play('wave_end', 0.3);

                // Start victory music
                this.setMusicState('victory');
                console.log('🎵 SoundManager: LEVEL COMPLETE - Victory music!');

                // Return to idle music after 8 bars (16 seconds at 120 BPM)
                if (this.victoryTimeout) {
                    clearTimeout(this.victoryTimeout);
                }
                this.victoryTimeout = setTimeout(() => {
                    this.setMusicState('idle');
                    this.victoryTimeout = null;
                }, 16000);
            }
        });

        console.log('🎵 SoundManager: Event listeners initialized');
    }

    startMusic() {
        if (!this.enabled || this.bgmInterval) return;
        console.log("Starting Advanced Sequencer @ 120 BPM");
        this.bgmInterval = setInterval(() => this.playStep(), 125); // 120 BPM, 16th notes
    }

    stopMusic() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    setMusicState(state) {
        if (this.musicState !== state) {
            this.musicState = state;
            console.log(`🎵 Music Mode: ${state.toUpperCase()}`);
        }
    }

    setTempo(bpm) {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            let msPerStep = (60000 / bpm) / 4;
            this.bgmInterval = setInterval(() => this.playStep(), msPerStep);
        }
    }

    // Reset music to initial state (for game restart)
    reset() {
        this.stopMusic();
        this.step = 0;
        this.musicState = 'idle';
        this.startMusic();
        this.setTempo(120);
        console.log("🎹 Music Engine Reset");
    }

    // ═══════════════════════════════════════════════════════════════
    // THE HEART: Advanced Step Sequencer
    // ═══════════════════════════════════════════════════════════════
    playStep() {
        if (!this.enabled) return;

        const stepInBar = this.step % 16;
        const barNumber = Math.floor(this.step / 16);
        const chordIndex = Math.floor(this.step / 32) % 4; // 2 bars per chord
        const chord = this.chords[chordIndex];

        // Calculate root frequency (C3 = 130.81 Hz as bass root)
        const rootFreq = 130.81 * Math.pow(2, chord.root / 12);

        // Humanization: slight random timing offset
        const humanize = () => Math.random() * 15 - 7.5;

        // ─────────────────────────────────────────────────────────────
        // LAYER 1: PERCUSSION (Wave and Victory modes)
        // ─────────────────────────────────────────────────────────────
        if (this.musicState === 'wave' || this.musicState === 'victory') {
            // Kick Drum (Low sine thump)
            if (this.rhythms.kick[stepInBar]) {
                setTimeout(() => {
                    this.playTone('sine', 55, 0.01, 0.15, 0.25, -20);
                }, humanize());
            }

            // Hi-Hat (High frequency click, very short)
            if (this.rhythms.hihat[stepInBar]) {
                setTimeout(() => {
                    this.playTone('triangle', 8000, 0.001, 0.03, 0.02, 0);
                }, humanize());
            }

            // Snare (Noise-like burst on 2 and 4)
            if (this.rhythms.snare[stepInBar]) {
                setTimeout(() => {
                    this.playTone('triangle', 200, 0.005, 0.1, 0.08, 100);
                }, humanize());
            }
        }

        // ─────────────────────────────────────────────────────────────
        // LAYER 2: WALKING BASS
        // ─────────────────────────────────────────────────────────────
        if (this.rhythms.bass[stepInBar]) {
            // Walking bass: alternate between root, 5th, octave
            let bassNote = rootFreq;
            const walkPattern = [1, 1.5, 2, 1.5]; // Root, 5th, Octave, 5th
            bassNote *= walkPattern[stepInBar % 4];

            // Add chromatic approach on beat 4 of bar 2
            if (stepInBar === 15) {
                const nextChord = this.chords[(chordIndex + 1) % 4];
                const nextRoot = 130.81 * Math.pow(2, nextChord.root / 12);
                // Approach from a half-step below
                bassNote = nextRoot * 0.944; // ~1 semitone below
            }

            setTimeout(() => {
                this.playTone('triangle', bassNote, 0.01, 0.2, 0.18, 0);
            }, humanize());
        }

        // ─────────────────────────────────────────────────────────────
        // LAYER 3: MELODIC HOOKS (Wave and Victory modes)
        // ─────────────────────────────────────────────────────────────
        if (this.musicState === 'wave' || this.musicState === 'victory') {
            const melodyPattern = this.melodies[this.musicState];
            const scaleDegree = melodyPattern[stepInBar];

            if (scaleDegree >= 0) {
                // Convert scale degree to frequency
                const semitone = this.pentatonic[scaleDegree % 5];
                const octave = Math.floor(scaleDegree / 5);
                const freq = 261.63 * Math.pow(2, (chord.root + semitone) / 12) * Math.pow(2, octave);

                // Victory music is slightly brighter (higher volume and shorter decay)
                const vol = this.musicState === 'victory' ? 0.06 : 0.04;
                const decay = this.musicState === 'victory' ? 0.2 : 0.15;

                setTimeout(() => {
                    this.playTone('sine', freq, 0.02, decay, vol, 0);
                }, humanize() + 5);
            }
        }

        // ─────────────────────────────────────────────────────────────
        // LAYER 4: CHORD STABS (Every 4 bars, beat 1)
        // ─────────────────────────────────────────────────────────────
        if (stepInBar === 0 && barNumber % 4 === 0 && (this.musicState === 'wave' || this.musicState === 'victory')) {
            // Play a soft chord stab
            const third = chord.type === 'major' ? 4 : 3; // Major 3rd or minor 3rd
            const fifth = 7;

            const chordFreqs = [
                261.63 * Math.pow(2, chord.root / 12),          // Root
                261.63 * Math.pow(2, (chord.root + third) / 12), // 3rd
                261.63 * Math.pow(2, (chord.root + fifth) / 12)  // 5th
            ];

            chordFreqs.forEach((f, i) => {
                setTimeout(() => {
                    this.playTone('sine', f, 0.05, 0.4, 0.025, 0);
                }, i * 10);
            });
        }

        // ─────────────────────────────────────────────────────────────
        // LAYER 5: TURNAROUND FILL (Last 2 beats before chord change)
        // ─────────────────────────────────────────────────────────────
        if (stepInBar >= 14 && (this.step + 2) % 32 === 0 && (this.musicState === 'wave' || this.musicState === 'victory')) {
            // V7 → I resolution: Play the dominant 7th leading tone
            const nextChord = this.chords[(chordIndex + 1) % 4];
            const dominant7 = 196 * Math.pow(2, nextChord.root / 12); // G as dominant of C

            if (stepInBar === 14) {
                this.playTone('sine', dominant7 * 1.25, 0.01, 0.1, 0.03, 0); // Major 3rd
            }
            if (stepInBar === 15) {
                this.playTone('sine', dominant7 * 1.5, 0.01, 0.15, 0.03, -10); // Resolve down
            }
        }

        this.step++;
    }

    // ═══════════════════════════════════════════════════════════════
    // SFX PLAYER
    // ═══════════════════════════════════════════════════════════════
    play(name, variance = 0.1) {
        if (!this.enabled || !this.presets[name]) return;

        try {
            let p = this.presets[name];
            let randomPitch = p.freq + p.freq * random(-variance, variance);
            let randomVol = p.vol + random(-0.02, 0.02);
            this.playTone(p.type, randomPitch, p.attack, p.decay, randomVol, p.slide);
        } catch (e) {
            console.error("Audio Error:", e);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CORE SYNTHESIZER
    // ═══════════════════════════════════════════════════════════════
    playTone(oscType, freq, attack, decay, vol, freqSlide = 0) {
        try {
            let osc = new p5.Oscillator(oscType);
            let env = new p5.Envelope();

            env.setADSR(attack, decay, 0, 0);
            env.setRange(vol * this.masterVolume, 0);

            osc.freq(Math.max(20, Math.min(freq, 15000))); // Clamp to audible range
            osc.start();
            env.play(osc);

            if (freqSlide !== 0) {
                osc.freq(Math.max(20, freq + freqSlide), attack + decay);
            }

            setTimeout(() => {
                osc.stop();
                osc.dispose();
            }, (attack + decay + 0.1) * 1000);
        } catch (e) {
            // Silently fail to avoid console spam
        }
    }
}
