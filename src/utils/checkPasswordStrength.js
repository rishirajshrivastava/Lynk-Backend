const checkPasswordStrength = (password) => {
    const errors = [];
    if (!password || password.length < 6) errors.push("at least 6 characters");
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
    if (!/\d/.test(password)) errors.push("one digit");
    if (!/[\W_]/.test(password)) errors.push("one special character");

    return errors;
}

module.exports = checkPasswordStrength;