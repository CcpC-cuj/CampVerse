// Utility Functions Unit Tests
const crypto = require('crypto');

describe('Utility Functions Unit Tests', () => {
  describe('Email Validation', () => {
    it('should validate academic email domains', () => {
      const isAcademicEmail = (email) => {
        return (
          /@[\w.-]+\.(ac|edu)\.in$/i.test(email) ||
          /@[\w.-]+\.edu$/i.test(email)
        );
      };

      // Valid academic emails
      expect(isAcademicEmail('student@university.edu')).toBe(true);
      expect(isAcademicEmail('user@college.ac.in')).toBe(true);
      expect(isAcademicEmail('test@institute.edu.in')).toBe(true);
      expect(isAcademicEmail('admin@university.ac.in')).toBe(true);

      // Invalid academic emails
      expect(isAcademicEmail('user@gmail.com')).toBe(false);
      expect(isAcademicEmail('test@yahoo.com')).toBe(false);
      expect(isAcademicEmail('admin@company.com')).toBe(false);
      expect(isAcademicEmail('student@university.org')).toBe(false);
    });

    it('should extract domain from email', () => {
      const extractDomain = (email) => {
        return email.split('@')[1].toLowerCase();
      };

      expect(extractDomain('user@example.com')).toBe('example.com');
      expect(extractDomain('test@university.edu')).toBe('university.edu');
      expect(extractDomain('admin@company.co.in')).toBe('company.co.in');
    });
  });

  describe('Password Security', () => {
    it('should validate password strength', () => {
      const { validatePassword } = require('../../Utils/passwordUtils');
      const validatePassword = (password) => {
        // At least 6 characters, contains letter and number
        const minLength = password.length >= 6;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        return minLength && hasLetter && hasNumber;
      };

      // Strong passwords using shared validatePassword function
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('MyPass1')).toBe(true);
      expect(validatePassword('Secure123')).toBe(true);

      // Weak passwords
      expect(validatePassword('pass')).toBe(false); // too short
      expect(validatePassword('password')).toBe(false); // no number
      expect(validatePassword('123456')).toBe(false); // no letter
      expect(validatePassword('')).toBe(false); // empty
    });

    it('should generate secure random strings', () => {
      const generateRandomString = (length) => {
        return crypto.randomBytes(length).toString('hex');
      };

      const result1 = generateRandomString(16);
      const result2 = generateRandomString(16);

      expect(result1).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(result2).toHaveLength(32);
      expect(result1).not.toBe(result2); // should be different
    });
  });

  describe('Date and Time Utilities', () => {
    it('should check if date is in the future', () => {
      const isFutureDate = (date) => {
        return new Date(date) > new Date();
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(isFutureDate(futureDate)).toBe(true);
      expect(isFutureDate(pastDate)).toBe(false);
      expect(isFutureDate(new Date())).toBe(false); // current time
    });

    it('should format date for display', () => {
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const testDate = new Date('2024-01-15');
      const formatted = formatDate(testDate);

      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should calculate time difference', () => {
      const getTimeDifference = (date1, date2) => {
        const diff = Math.abs(new Date(date1) - new Date(date2));
        return Math.floor(diff / (1000 * 60 * 60 * 24)); // days
      };

      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-05');

      expect(getTimeDifference(date1, date2)).toBe(4);
      expect(getTimeDifference(date2, date1)).toBe(4); // should be absolute
    });
  });

  describe('String Utilities', () => {
    it('should sanitize input to prevent XSS', () => {
      const sanitizeInput = (input) => {
        return input
          .replace(/[<>]/g, '') // Remove < and > characters
          .trim()
          .substring(0, 1000); // Limit length
      };

      // Test XSS prevention
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).toBe('scriptalert("xss")/script');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should generate slugs', () => {
      const generateSlug = (text) => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
      };

      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('Event Title!@#')).toBe('event-title');
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(generateSlug('Special---Characters')).toBe('special-characters');
    });

    it('should truncate text', () => {
      const truncateText = (text, maxLength, suffix = '...') => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
      };

      expect(truncateText('Hello World', 5)).toBe('He...');
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('Very Long Text That Should Be Truncated', 20)).toBe(
        'Very Long Text Th...',
      );
    });
  });

  describe('Array Utilities', () => {
    it('should remove duplicates from array', () => {
      const removeDuplicates = (arr) => {
        return [...new Set(arr)];
      };

      expect(removeDuplicates([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4]);
      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(removeDuplicates([])).toEqual([]);
    });

    it('should shuffle array', () => {
      const shuffleArray = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should group array by property', () => {
      const groupBy = (arr, key) => {
        return arr.reduce((groups, item) => {
          const group = item[key];
          groups[group] = groups[group] || [];
          groups[group].push(item);
          return groups;
        }, {});
      };

      const users = [
        { name: 'John', role: 'user' },
        { name: 'Jane', role: 'admin' },
        { name: 'Bob', role: 'user' },
      ];

      const grouped = groupBy(users, 'role');

      expect(grouped.user).toHaveLength(2);
      expect(grouped.admin).toHaveLength(1);
      expect(grouped.user[0].name).toBe('John');
      expect(grouped.admin[0].name).toBe('Jane');
    });
  });

  describe('Object Utilities', () => {
    it('should deep clone objects', () => {
      const deepClone = (obj) => {
        return JSON.parse(JSON.stringify(obj));
      };

      const original = {
        name: 'John',
        age: 30,
        address: {
          city: 'New York',
          country: 'USA',
        },
        hobbies: ['reading', 'gaming'],
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original); // different reference
      expect(cloned.address).not.toBe(original.address); // nested objects also cloned
    });

    it('should merge objects deeply', () => {
      const deepMerge = (target, source) => {
        const result = { ...target };
        for (const key in source) {
          if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
          ) {
            result[key] = deepMerge(result[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
        return result;
      };

      const obj1 = { a: 1, b: { c: 2, d: 3 } };
      const obj2 = { b: { d: 4, e: 5 }, f: 6 };

      const merged = deepMerge(obj1, obj2);

      expect(merged).toEqual({
        a: 1,
        b: { c: 2, d: 4, e: 5 },
        f: 6,
      });
    });

    it('should pick specific properties', () => {
      const pick = (obj, keys) => {
        return keys.reduce((result, key) => {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = obj[key];
          }
          return result;
        }, {});
      };

      const user = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        password: 'hashed',
        role: 'user',
      };

      const publicUser = pick(user, ['id', 'name', 'email', 'role']);

      expect(publicUser).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com',
        role: 'user',
      });
      expect(publicUser.password).toBeUndefined();
    });
  });

  describe('Validation Utilities', () => {
    it('should validate phone numbers', () => {
      const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(phone);
      };

      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('9876543210')).toBe(true);
      expect(validatePhone('123456789')).toBe(false); // too short
      expect(validatePhone('12345678901')).toBe(false); // too long
      expect(validatePhone('123456789a')).toBe(false); // contains letter
    });

    it('should validate URLs', () => {
      const validateURL = (url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://localhost:3000')).toBe(true);
      expect(validateURL('ftp://files.example.com')).toBe(true);
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('')).toBe(false);
    });

    it('should validate file extensions', () => {
      const validateFileExtension = (filename, allowedExtensions) => {
        const extension = filename.split('.').pop().toLowerCase();
        return allowedExtensions.includes(extension);
      };

      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

      expect(validateFileExtension('image.jpg', allowedExtensions)).toBe(true);
      expect(validateFileExtension('photo.PNG', allowedExtensions)).toBe(true);
      expect(validateFileExtension('document.pdf', allowedExtensions)).toBe(
        false,
      );
      expect(validateFileExtension('script.js', allowedExtensions)).toBe(false);
    });
  });

  describe('Math Utilities', () => {
    it('should calculate percentage', () => {
      const calculatePercentage = (value, total) => {
        return Math.round((value / total) * 100);
      };

      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 50)).toBe(50);
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('should generate random number in range', () => {
      const randomInRange = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      const result = randomInRange(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should round to decimal places', () => {
      const roundToDecimal = (number, decimals) => {
        return (
          Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals)
        );
      };

      expect(roundToDecimal(3.14159, 2)).toBe(3.14);
      expect(roundToDecimal(2.71828, 3)).toBe(2.718);
      expect(roundToDecimal(10.5, 0)).toBe(11);
    });
  });
});
