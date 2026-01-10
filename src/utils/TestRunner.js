/**
 * TestRunner.js - Lightweight test framework with console control
 *
 * Features:
 * - Suppresses verbose console output during tests
 * - Reports pass/fail with clear formatting
 * - Supports async tests
 * - Groups tests into suites
 *
 * Usage:
 *   TestRunner.suite('UnitBuilder', () => {
 *       TestRunner.test('should create unit with defaults', () => {
 *           const unit = new UnitBuilder().build();
 *           TestRunner.assert(unit !== null, 'Unit should exist');
 *       });
 *   });
 *   TestRunner.run();
 */

class TestRunner {
    static suites = [];
    static currentSuite = null;
    static results = { passed: 0, failed: 0, errors: [] };
    static suppressConsole = true;
    static originalConsole = {};

    /**
     * Define a test suite
     * @param {string} name - Suite name
     * @param {Function} fn - Function containing tests
     */
    static suite(name, fn) {
        this.suites.push({ name, fn, tests: [] });
    }

    /**
     * Define a test within a suite
     * @param {string} description - Test description
     * @param {Function} fn - Test function
     */
    static test(description, fn) {
        if (this.currentSuite) {
            this.currentSuite.tests.push({ description, fn });
        }
    }

    /**
     * Assert a condition is true
     * @param {boolean} condition
     * @param {string} message - Failure message
     */
    static assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Assert two values are equal
     * @param {*} actual
     * @param {*} expected
     * @param {string} message
     */
    static assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(
                `${message ? message + ': ' : ''}Expected ${expected}, got ${actual}`
            );
        }
    }

    /**
     * Assert two values are deeply equal (objects/arrays)
     * @param {*} actual
     * @param {*} expected
     * @param {string} message
     */
    static assertDeepEqual(actual, expected, message = '') {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(
                `${message ? message + ': ' : ''}Expected ${expectedStr}, got ${actualStr}`
            );
        }
    }

    /**
     * Assert value is of expected type
     * @param {*} value
     * @param {string} expectedType
     * @param {string} message
     */
    static assertType(value, expectedType, message = '') {
        const actualType = typeof value;
        if (actualType !== expectedType) {
            throw new Error(
                `${message ? message + ': ' : ''}Expected type ${expectedType}, got ${actualType}`
            );
        }
    }

    /**
     * Assert value is instance of class
     * @param {*} value
     * @param {Function} constructor
     * @param {string} message
     */
    static assertInstanceOf(value, constructor, message = '') {
        if (!(value instanceof constructor)) {
            throw new Error(
                `${message ? message + ': ' : ''}Expected instance of ${constructor.name}`
            );
        }
    }

    /**
     * Assert function throws an error
     * @param {Function} fn
     * @param {string} message
     */
    static assertThrows(fn, message = 'Expected function to throw') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message);
        }
    }

    /**
     * Suppress console output
     */
    static muteConsole() {
        if (!this.suppressConsole) return;

        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };

        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
        // Keep console.error for test failures
    }

    /**
     * Restore console output
     */
    static unmuteConsole() {
        if (!this.suppressConsole) return;

        console.log = this.originalConsole.log || console.log;
        console.warn = this.originalConsole.warn || console.warn;
        console.error = this.originalConsole.error || console.error;
        console.info = this.originalConsole.info || console.info;
    }

    /**
     * Run all test suites
     * @param {boolean} suppressOutput - Suppress console during tests
     */
    static async run(suppressOutput = true) {
        this.suppressConsole = suppressOutput;
        this.results = { passed: 0, failed: 0, errors: [] };

        console.log('%c=== Running Tests ===', 'color: #00aaff; font-weight: bold');

        for (const suite of this.suites) {
            this.currentSuite = suite;

            console.log(`%c[Suite] ${suite.name}`, 'color: #aaaaaa');

            // Execute suite function to register tests
            try {
                suite.fn();
            } catch (e) {
                console.error(`Suite setup error: ${e.message}`);
                continue;
            }

            // Run each test in the suite
            for (const test of suite.tests) {
                this.muteConsole();

                try {
                    const result = test.fn();
                    // Handle async tests
                    if (result instanceof Promise) {
                        await result;
                    }

                    this.unmuteConsole();
                    console.log(`  %c✓ ${test.description}`, 'color: #00cc00');
                    this.results.passed++;

                } catch (e) {
                    this.unmuteConsole();
                    console.log(`  %c✗ ${test.description}`, 'color: #ff4444');
                    console.log(`    %c${e.message}`, 'color: #ff8888');
                    this.results.failed++;
                    this.results.errors.push({
                        suite: suite.name,
                        test: test.description,
                        error: e.message
                    });
                }
            }

            // Clear tests for next run
            suite.tests = [];
        }

        this.currentSuite = null;
        this.printSummary();

        return this.results;
    }

    /**
     * Print test summary
     */
    static printSummary() {
        const total = this.results.passed + this.results.failed;
        const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

        console.log('%c=== Test Summary ===', 'color: #00aaff; font-weight: bold');
        console.log(
            `%c${this.results.passed} passed, ${this.results.failed} failed (${passRate}%)`,
            this.results.failed > 0 ? 'color: #ff4444' : 'color: #00cc00'
        );

        if (this.results.errors.length > 0) {
            console.log('%cFailed tests:', 'color: #ff4444');
            for (const err of this.results.errors) {
                console.log(`  - ${err.suite}: ${err.test}`);
            }
        }
    }

    /**
     * Clear all registered suites
     */
    static clear() {
        this.suites = [];
        this.results = { passed: 0, failed: 0, errors: [] };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}
