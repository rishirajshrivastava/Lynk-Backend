const validateEditProfileData = (req) => {
    const allowedEditFields = ['firstName', 'lastName', 'age','photoUrl', 'about','skills','gender'];
    const isEditAllowed = Object.keys(req.body).every((field) =>allowedEditFields.includes(field));
    return isEditAllowed;
}

module.exports = validateEditProfileData;