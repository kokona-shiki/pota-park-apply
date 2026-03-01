import { isValidUrl, normalizeUrl } from '../urlValidation';

describe('URL Validation Utilities', () => {
  describe('isValidUrl', () => {
    test('should return true for valid URLs with https protocol', () => {
      expect(isValidUrl('https://www.example.com')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com?query=value')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    test('should return true for valid URLs with http protocol', () => {
      expect(isValidUrl('http://www.example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://subdomain.example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('http://example.com?query=value')).toBe(true);
      expect(isValidUrl('http://example.com/path?query=value')).toBe(true);
    });

    test('should return true for URLs without protocol (adds https by default)', () => {
      expect(isValidUrl('www.example.com')).toBe(true);
      expect(isValidUrl('example.com')).toBe(true);
      expect(isValidUrl('subdomain.example.com')).toBe(true);
      expect(isValidUrl('example.com/path')).toBe(true);
      expect(isValidUrl('example.com?query=value')).toBe(true);
    });

    test('should return true for empty string (optional field)', () => {
      expect(isValidUrl('')).toBe(true);
      expect(isValidUrl('   ')).toBe(true); // whitespace-only string is treated as empty
    });

    test('should return false for invalid URLs', () => {
      expect(isValidUrl('htp://invalid.com')).toBe(false); // wrong protocol
      expect(isValidUrl('ftp://ftp.example.com')).toBe(false); // unsupported protocol
      expect(isValidUrl('javascript:alert("xss")')).toBe(false); // dangerous protocol
      expect(isValidUrl('not-a-url')).toBe(false); // not a valid URL format
      expect(isValidUrl('..com')).toBe(false); // invalid format
      expect(isValidUrl('http://')).toBe(false); // incomplete URL
      expect(isValidUrl('https://')).toBe(false); // incomplete URL
      expect(isValidUrl('example')).toBe(false); // missing domain extension
      expect(isValidUrl('htp://')).toBe(false); // incomplete URL with invalid protocol
      expect(isValidUrl('')).toBe(true); // empty string is valid (optional field)
      expect(isValidUrl('   ')).toBe(true); // whitespace-only string is treated as empty
    });
  });

  describe('normalizeUrl', () => {
    test('should return URLs with https protocol unchanged', () => {
      expect(normalizeUrl('https://www.example.com')).toBe('https://www.example.com');
      expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
    });

    test('should return URLs with http protocol unchanged', () => {
      expect(normalizeUrl('http://www.example.com')).toBe('http://www.example.com');
      expect(normalizeUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    test('should add https:// prefix to URLs without protocol', () => {
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('subdomain.example.com')).toBe('https://subdomain.example.com');
      expect(normalizeUrl('example.com/path')).toBe('https://example.com/path');
      expect(normalizeUrl('example.com?query=value')).toBe('https://example.com?query=value');
    });

    test('should return empty string unchanged', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl('   ')).toBe('   '); // whitespace-only string preserved as-is
    });
  });
});
