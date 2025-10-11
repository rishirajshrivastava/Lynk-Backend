const validateEditProfileData = (req) => {
    const allowedEditFields = ['firstName', 'lastName','photoUrl', 'about','skills', 'weight', 'occupation', 'education', 'smoking', 'drinking', 'exercise', 'diet','relationshipStatus', 'hasKids','wantKids','hobbies', 'languages']
    const isEditAllowed = Object.keys(req.body).every((field) =>allowedEditFields.includes(field));
    return isEditAllowed;
}

module.exports = validateEditProfileData;