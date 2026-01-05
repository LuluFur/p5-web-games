/**
 * WaveDialogue.js - Level-specific wave dialogue configuration
 *
 * Organized by level for easy editing and searching.
 * Each level has 10 waves (configurable in LEVEL_CONSTANTS.WAVES_PER_LEVEL)
 *
 * Wave Numbers:
 * - Level 1: Waves 1-10
 * - Level 2: Waves 11-20
 * - Level 3: Waves 21-30
 * - Level 4: Waves 31-40
 * - Level 5: Waves 41-50
 *
 * Search Tips:
 * - Find dialogue for wave 15: Search "15:"
 * - Find all Level 2 dialogue: Search "// === LEVEL 2"
 * - Find vampire dialogue: Search "vampire" or "VAMPIRE"
 */

const WAVE_DIALOGUE = {
    // ===========================================
    // === LEVEL 1: Tutorial (Waves 1-10) ===
    // ===========================================
    // Unlocked enemies: Zombie, Skeleton

    1: {
        title: "THE DEAD RISE",
        text: "{green}Zombies{/green} are approaching! Build {gold}TOWERS{/gold} to defend your base.\nPrevent them from reaching the {red}RIGHT SIDE{/red}!",
        type: 'zombie'
    },

    // Wave 5 milestone - show generated dialogue (handled by WaveManager)
    // Wave 10 milestone - show generated dialogue (handled by WaveManager)

    // ===========================================
    // === LEVEL 2: Tanky & Fast (Waves 11-20) ===
    // ===========================================
    // Unlocked enemies: Zombie, Skeleton, Vampire, Swarm

    11: {
        title: "NEW ENEMY: VAMPIRE",
        text: "{red}{shake}Vampires{/shake}{/red} are slow but {gold}VERY TANKY{/gold}!\nThey need {orange}CONCENTRATED FIRE{/orange} to bring down.",
        type: 'vampire'
    },

    14: {
        title: "SWARM INCOMING!",
        text: "{cyan}{wave}Tiny fast creatures{/wave}{/cyan}! Use {orange}RAPID-FIRE{/orange} or {red}AOE TOWERS{/red}!",
        type: 'zombie'
    },

    // Wave 15 milestone - show generated dialogue
    // Wave 20 milestone - show generated dialogue

    // ===========================================
    // === LEVEL 3: Speed Demons (Waves 21-30) ===
    // ===========================================
    // Unlocked enemies: Zombie, Skeleton, Vampire, Swarm, Wraith, Goblin

    21: {
        title: "NEW ENEMY: WRAITH",
        text: "{purple}{glow}Wraiths{/glow}{/purple} are {red}{bounce}EXTREMELY FAST{/bounce}{/red}!\nBuild {gold}STRONG EARLY DEFENSES{/gold}.",
        type: 'wraith'
    },

    24: {
        title: "GOBLIN RAID",
        text: "Goblins are nimble raiders!\nThey'll try to overwhelm your defenses.",
        type: 'goblin'
    },

    // Wave 25 milestone - show generated dialogue
    // Wave 30 milestone - show generated dialogue

    30: {
        title: "THE HORDE",
        text: "Multiple enemy types incoming!\nYour defenses will be tested.",
        type: 'zombie'
    },

    // ===========================================
    // === LEVEL 4: Armored (Waves 31-40) ===
    // ===========================================
    // Unlocked enemies: All previous + Golem, Regenerator

    31: {
        title: "NEW ENEMY: GOLEM",
        text: "{darkred}{pulse}Stone Golems{/pulse}{/darkred} have {orange}50% ARMOR{/orange}!\n{gold}HIGH-DAMAGE TOWERS{/gold} work best.",
        type: 'zombie'
    },

    34: {
        title: "NEW ENEMY: REGENERATOR",
        text: "These slimes heal if not damaged!\nKeep constant fire on them.",
        type: 'zombie'
    },

    // Wave 35 milestone - show generated dialogue
    // Wave 40 milestone - show generated dialogue

    // ===========================================
    // === LEVEL 5: Boss Level (Waves 41-50) ===
    // ===========================================
    // Unlocked enemies: All + Ogre, Necromancer

    41: {
        title: "OGRE SIGHTED",
        text: "{orange}{shake}Massive ogres{/shake}{/orange} with {red}{pulse}ENORMOUS HEALTH{/pulse}{/red}!\n{gold}CONCENTRATE ALL FIREPOWER{/gold}.",
        type: 'ogre'
    },

    44: {
        title: "APOCALYPSE",
        text: "{red}{shake}EVERYTHING{/shake}{/red} is coming!\nThis is the {gold}{bounce}FINAL TEST{/bounce}{/gold} before the {purple}Dark Lord{/purple}.",
        type: 'vampire'
    },

    45: {
        title: "FINAL PUSH",
        text: "Elite enemies approach!\nThe Dark Lord prepares his arrival...",
        type: 'zombie'
    },

    // Wave 45 milestone - show generated dialogue
    // Wave 50 milestone - show generated dialogue

    // ===========================================
    // === BOSS WAVES (After Level 5) ===
    // ===========================================

    51: {
        title: "BOSS: THE NECROMANCER",
        text: "The {purple}{shake}Dark Lord{/shake}{/purple} has arrived! He {green}{wiggle}RAISES THE DEAD{/wiggle}{/green} to shield himself.\n{red}{bounce}FOCUS YOUR FIRE!{/bounce}{/red}",
        type: 'necromancer'
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.WAVE_DIALOGUE = WAVE_DIALOGUE;
}
