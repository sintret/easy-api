Meteor.startup(function() {
    return describe('The default authentication endpoints', function() {
        var email, emailLoginToken, password, token, userId, username;
        token = null;
        emailLoginToken = null;
        username = 'test';
        email = 'test@ivus.com';
        password = 'password';
        Meteor.users.remove({
            username: username
        });
        userId = Accounts.createUser({
            username: username,
            email: email,
            password: password
        });
        it('should allow a user to login', function(test, next) {
            return HTTP.post(Meteor.absoluteUrl('/api/v1/login'), {
                data: {
                    user: username,
                    password: password
                }
            }, function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                test.equal(response.data.userId, userId);
                test.isTrue(response.data.authToken);
                token = response.data.authToken;
                return next();
            });
        });
        it('should allow a user to login again, without affecting the first login', function(test, next) {
            return HTTP.post(Meteor.absoluteUrl('/api/v1/login'), {
                data: {
                    user: email,
                    password: password
                }
            }, function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                test.equal(response.data.userId, userId);
                test.isTrue(response.data.authToken);
                test.notEqual(token, response.data.authToken);
                emailLoginToken = response.data.authToken;
                return next();
            });
        });
        it('should not allow a user with wrong password to login and should respond after 500 msec', function(test, next) {
            var startTime;
            startTime = new Date();
            return HTTP.post(Meteor.absoluteUrl('/api/v1/login'), {
                data: {
                    user: username,
                    password: "NotAllowed"
                }
            }, function(error, result) {
                var durationInMilliseconds, response;
                response = JSON.parse(result.content);
                test.equal(result.statusCode, 401);
                test.equal(response.status, 'error');
                durationInMilliseconds = new Date() - startTime;
                test.isTrue(durationInMilliseconds >= 500);
                return next();
            });
        });
        it('should allow a user to logout', function(test, next) {
            return HTTP.get(Meteor.absoluteUrl('/api/v1/logout'), {
                headers: {
                    'X-User-Id': userId,
                    'X-Auth-Token': token
                }
            }, function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                return next();
            });
        });
        it('should remove the logout token after logging out and should respond after 500 msec', function(test, next) {
            var startTime;
            Restivus.addRoute('prevent-access-after-logout', {
                authRequired: true
            }, {
                get: function() {
                    return true;
                }
            });
            startTime = new Date();
            return HTTP.get(Meteor.absoluteUrl('/api/v1/prevent-access-after-logout'), {
                headers: {
                    'X-User-Id': userId,
                    'X-Auth-Token': token
                }
            }, function(error, result) {
                var durationInMilliseconds, response;
                response = JSON.parse(result.content);
                test.isTrue(error);
                test.equal(result.statusCode, 401);
                test.equal(response.status, 'error');
                durationInMilliseconds = new Date() - startTime;
                test.isTrue(durationInMilliseconds >= 500);
                return next();
            });
        });
        return it('should allow a second logged in user to logout', function(test, next) {
            return HTTP.get(Meteor.absoluteUrl('/api/v1/logout'), {
                headers: {
                    'X-User-Id': userId,
                    'X-Auth-Token': emailLoginToken
                }
            }, function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                return next();
            });
        });
    });
});