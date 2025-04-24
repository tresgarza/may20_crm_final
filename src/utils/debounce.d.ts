/**
 * Debounce function declaration file
 */

/**
 * Debounces a function call, ensuring it's only called after a certain
 * amount of time has passed since it was last invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of the trailing edge
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void;

/**
 * Debounces an async function, handling promise resolution appropriately
 * 
 * @param func - The async function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of the trailing edge
 * @returns A debounced version of the async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => Promise<ReturnType<T>>;

/**
 * Throttles a function call, ensuring it's only called at most once 
 * in the specified time period.
 * 
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void;

declare const _default: typeof debounce;
export default _default; 