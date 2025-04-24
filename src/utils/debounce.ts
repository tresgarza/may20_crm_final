/**
 * Utility functions for debouncing and throttling function calls
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
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  };
}

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
  immediate: boolean = false
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this;
    
    // If we have a pending promise already, return it
    if (pendingPromise) {
      return pendingPromise;
    }
    
    // If immediate execution is requested and we're not waiting, call the function right away
    if (immediate && !timeout) {
      pendingPromise = func.apply(context, args) as Promise<ReturnType<T>>;
      
      // Clear the pending promise reference when it resolves or rejects
      pendingPromise
        .then(result => {
          pendingPromise = null;
          return result;
        })
        .catch(error => {
          pendingPromise = null;
          throw error;
        });
        
      return pendingPromise;
    }
    
    // Create a new promise that will be resolved when the debounced function is executed
    return new Promise((resolve, reject) => {
      const later = function() {
        timeout = null;
        
        if (!immediate) {
          pendingPromise = func.apply(context, args) as Promise<ReturnType<T>>;
          
          pendingPromise
            .then(result => {
              pendingPromise = null;
              resolve(result);
              return result;
            })
            .catch(error => {
              pendingPromise = null;
              reject(error);
              throw error;
            });
        }
      };
      
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(later, wait);
    });
  };
}

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
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      
      previous = now;
      func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(function() {
        previous = Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}

export default debounce; 