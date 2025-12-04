// Utility for password validation
// Strong password policy: min 8 chars, uppercase, lowercase, number, special char
// Allowed special characters: @$!%*?&#^()-_+={}[]|\:;"'<>,.~/`
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\@\$\!\%\*\?\&\#\^\(\)\-\_\+\=\{\}\[\]\|\\\:\;\'\"\<\>\,\.\~\/\`])[A-Za-z\d\@\$\!\%\*\?\&\#\^\(\)\-\_\+\=\{\}\[\]\|\\\:\;\'\"\<\>\,\.\~\/\`]{8,}$/;

function validatePassword(password) {
  return password && PASSWORD_REGEX.test(password);
}

module.exports = {
  PASSWORD_REGEX,
  validatePassword,
};
