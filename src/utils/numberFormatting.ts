/**
 * Utilities for consistent number formatting and parsing throughout the application
 */

/**
 * Formats a number as currency with proper locale
 * @param value The number to format
 * @param locale The locale to use (defaults to en-US)
 * @param currency The currency code (defaults to USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | null | undefined,
  locale = 'en-US',
  currency = 'USD'
): string => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formats a number as percentage
 * @param value The number to format (0.1 = 10%)
 * @param locale The locale to use (defaults to en-US)
 * @param digits Number of decimal places (defaults to 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | null | undefined,
  locale = 'en-US',
  digits = 2
): string => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
};

/**
 * Formats a number with proper thousands separators
 * @param value The number to format
 * @param locale The locale to use (defaults to en-US)
 * @param digits Number of decimal places (defaults to 0)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | null | undefined,
  locale = 'en-US',
  digits = 0
): string => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
};

/**
 * Parses a string to a number, handling various formats
 * @param value The string value to parse
 * @returns The parsed number or undefined if invalid
 */
export const parseNumericString = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined;
  
  // Remove all non-numeric characters except decimal point and minus sign
  const normalizedValue = value
    .replace(/[^0-9.-]/g, '')
    .replace(/(\..*)\./g, '$1'); // Allow only one decimal point
  
  const parsedValue = parseFloat(normalizedValue);
  
  return isNaN(parsedValue) ? undefined : parsedValue;
};

/**
 * Processes a field value to ensure it's properly stored as a number
 * @param value The value to process, which can be a number, string, or null/undefined
 * @returns The processed number value or null if the input is null/undefined/invalid
 */
export const processNumericField = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  return parseNumericString(value) ?? null;
};

/**
 * Converts a numeric string to a properly formatted display value
 * @param value The numeric string to format
 * @param type The type of formatting to apply
 * @param options Additional formatting options
 * @returns Formatted display value
 */
export const formatDisplayValue = (
  value: string | number | null | undefined,
  type: 'currency' | 'percentage' | 'number',
  options?: {
    locale?: string;
    currency?: string;
    digits?: number;
  }
): string => {
  if (value === null || value === undefined || value === '') return '';
  
  const numericValue = typeof value === 'string' 
    ? parseNumericString(value) 
    : value;
  
  if (numericValue === undefined) return '';
  
  const locale = options?.locale || 'en-US';
  
  switch (type) {
    case 'currency':
      return formatCurrency(numericValue, locale, options?.currency);
    case 'percentage':
      return formatPercentage(numericValue, locale, options?.digits);
    case 'number':
      return formatNumber(numericValue, locale, options?.digits);
    default:
      return String(value);
  }
}; 