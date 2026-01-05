// GameMath.js - Utility class for common math operations
class GameMath {
    // Calculate distance between two points
    static distance(x1, y1, x2, y2) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate angle between two points (radians)
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // Linear interpolation
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    // Random float between min and max
    static randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // Random integer between min and max (inclusive)
    static randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    // Convert degrees to radians
    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Convert radians to degrees
    static radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    // Map a value from one range to another
    static map(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    }
}
