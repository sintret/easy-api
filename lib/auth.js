var getUserQuerySelector, userValidator;

this.Auth || (this.Auth = {});


/*
 A valid user will have exactly one of the following identification fields: id, username, or email
 */

userValidator = Match.Where(function(user) {
    check(user, {
        id: Match.Optional(String),
        username: Match.Optional(String),
        email: Match.Optional(String)
    });
    if (_.keys(user).length === !1) {
        throw new Match.Error('User must have exactly one identifier field');
    }
    return true;
});


/*
 Return a MongoDB query selector for finding the given user
 */

getUserQuerySelector = function(user) {
    if (user.id) {
        return {
            '_id': user.id
        };
    } else if (user.username) {
        return {
            'username': user.username
        };
    } else if (user.email) {
        return {
            'emails.address': user.email
        };
    }
    throw new Error('Cannot create selector from invalid user');
};


/*
 Log a user in with their password
 */

this.Auth.loginWithPassword = function(user, password) {
    var authToken, authenticatingUser, authenticatingUserSelector, hashedToken, passwordVerification, ref;
    if (!user || !password) {
        throw new Meteor.Error(401, 'Unauthorized');
    }
    check(user, userValidator);
    check(password, String);
    authenticatingUserSelector = getUserQuerySelector(user);
    authenticatingUser = Meteor.users.findOne(authenticatingUserSelector);
    if (!authenticatingUser) {
        throw new Meteor.Error(401, 'Unauthorized');
    }
    if (!((ref = authenticatingUser.services) != null ? ref.password : void 0)) {
        throw new Meteor.Error(401, 'Unauthorized');
    }
    passwordVerification = Accounts._checkPassword(authenticatingUser, password);
    if (passwordVerification.error) {
        throw new Meteor.Error(401, 'Unauthorized');
    }
    authToken = Accounts._generateStampedLoginToken();
    hashedToken = Accounts._hashLoginToken(authToken.token);
    Accounts._insertHashedLoginToken(authenticatingUser._id, {
        hashedToken: hashedToken
    });
    return {
        authToken: authToken.token,
        userId: authenticatingUser._id
    };
};