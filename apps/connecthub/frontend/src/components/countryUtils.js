import { countries, DEFAULT_DIAL } from './CountryCodeDropdown';

/**
 * Find country by dial code
 * @param {string} dialCode - The dial code (e.g., "91", "1")
 * @returns {Object|null} - Country object or null if not found
 */
export const findCountryByDialCode = (dialCode) => {
  return countries.find(country => country.dial === String(dialCode)) || null;
};

/**
 * Find country by country code
 * @param {string} countryCode - The country code (e.g., "IN", "US")
 * @returns {Object|null} - Country object or null if not found
 */
export const findCountryByCode = (countryCode) => {
  return countries.find(country => country.code.toLowerCase() === String(countryCode).toLowerCase()) || null;
};

/**
 * Get country by name (partial or full match)
 * @param {string} countryName - The country name
 * @returns {Object|null} - Country object or null if not found
 */
export const findCountryByName = (countryName) => {
  const name = String(countryName).toLowerCase();
  return countries.find(country => 
    country.name.toLowerCase().includes(name)
  ) || null;
};

/**
 * Format phone number with country code
 * @param {string} phoneNumber - The phone number
 * @param {string} dialCode - The dial code (optional)
 * @returns {string} - Formatted phone number
 */
export const formatPhoneWithCountryCode = (phoneNumber, dialCode = DEFAULT_DIAL) => {
  const cleanPhone = String(phoneNumber || '').replace(/\s+/g, '');
  
  // If phone already starts with +, return as is
  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }
  
  // If phone starts with the dial code, add + only
  if (cleanPhone.startsWith(dialCode)) {
    return `+${cleanPhone}`;
  }
  
  // Otherwise, add dial code and +
  return `+${dialCode}${cleanPhone}`;
};

/**
 * Parse phone number to extract country code and local number
 * @param {string} phoneNumber - The phone number (with or without +)
 * @param {string} defaultDialCode - Default dial code to use
 * @returns {Object} - { countryCode, localNumber, fullNumber }
 */
export const parsePhoneNumber = (phoneNumber, defaultDialCode = DEFAULT_DIAL) => {
  const cleanPhone = String(phoneNumber || '').replace(/\s+/g, '');
  
  if (cleanPhone.startsWith('+')) {
    // Phone has + prefix, extract country code
    const withoutPlus = cleanPhone.slice(1);
    
    // Try to match with known country codes (longest first for better matching)
    const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);
    
    for (const country of sortedCountries) {
      if (withoutPlus.startsWith(country.dial)) {
        return {
          countryCode: country.dial,
          localNumber: withoutPlus.slice(country.dial.length),
          fullNumber: cleanPhone,
          country
        };
      }
    }
    
    // If no match found, assume default country code
    return {
      countryCode: defaultDialCode,
      localNumber: withoutPlus,
      fullNumber: cleanPhone,
      country: findCountryByDialCode(defaultDialCode)
    };
  } else {
    // Phone doesn't have + prefix
    // Check if it starts with a known country code
    const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);
    
    for (const country of sortedCountries) {
      if (cleanPhone.startsWith(country.dial) && cleanPhone.length > country.dial.length) {
        return {
          countryCode: country.dial,
          localNumber: cleanPhone.slice(country.dial.length),
          fullNumber: `+${cleanPhone}`,
          country
        };
      }
    }
    
    // Assume it's a local number with default country code
    return {
      countryCode: defaultDialCode,
      localNumber: cleanPhone,
      fullNumber: `+${defaultDialCode}${cleanPhone}`,
      country: findCountryByDialCode(defaultDialCode)
    };
  }
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - The phone number to validate
 * @param {boolean} allowSpecialChars - Allow * and # characters
 * @returns {boolean} - Whether the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber, allowSpecialChars = true) => {
  const cleanPhone = String(phoneNumber || '').replace(/\s+/g, '');
  
  if (!cleanPhone) return false;
  
  // Basic pattern: optional +, followed by digits, and optionally * and #
  const pattern = allowSpecialChars 
    ? /^\+?[0-9*#]+$/ 
    : /^\+?[0-9]+$/;
    
  return pattern.test(cleanPhone);
};

/**
 * Get all available countries
 * @returns {Array} - Array of all country objects
 */
export const getAllCountries = () => {
  return [...countries];
};

/**
 * Get default country object
 * @returns {Object} - Default country object
 */
export const getDefaultCountry = () => {
  return findCountryByDialCode(DEFAULT_DIAL) || countries[0];
};

export { countries, DEFAULT_DIAL };