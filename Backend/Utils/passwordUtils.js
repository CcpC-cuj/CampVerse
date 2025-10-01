// Utility for password validation
// Strong password policy: min 8 chars, uppercase, lowercase, number, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function validatePassword(password) {
  return password && PASSWORD_REGEX.test(password);
}

module.exports = {
  PASSWORD_REGEX,
  validatePassword,
};
