/**
 * Delays the execution of code by a specified amount of time.
 * @typedef {Function} Delay
 * @param {number} ms - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
export function delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
