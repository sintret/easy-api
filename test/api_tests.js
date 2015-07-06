Meteor.startup(function() {
    describe('An API', function() {
        context('that hasn\'t been configured', function() {
            it('should have default settings', function(test) {
                test.equal(EasyApi.config.apiPath, 'api/');
                test.isFalse(EasyApi.config.useAuth);
                test.isFalse(EasyApi.config.prettyJson);
                return test.equal(EasyApi.config.auth.token, 'services.resume.loginTokens.hashedToken');
            });
            it('should allow you to add an unconfigured route', function(test) {
                var route;
                EasyApi.addRoute('test1', {
                    authRequired: true,
                    roleRequired: 'admin'
                }, {
                    get: function() {
                        return 1;
                    }
                });
                route = EasyApi.routes[2];
                test.equal(route.path, 'test1');
                test.equal(route.endpoints.get(), 1);
                test.isTrue(route.options.authRequired);
                test.equal(route.options.roleRequired, 'admin');
                test.isUndefined(route.endpoints.get.authRequired);
                return test.isUndefined(route.endpoints.get.roleRequired);
            });
            it('should allow you to add an unconfigured collection route', function(test) {
                var route;
                EasyApi.addCollection(new Mongo.Collection('tests'), {
                    routeOptions: {
                        authRequired: true,
                        roleRequired: 'admin'
                    },
                    endpoints: {
                        getAll: {
                            action: function() {
                                return 2;
                            }
                        }
                    }
                });
                route = EasyApi.routes[3];
                test.equal(route.path, 'tests');
                test.equal(route.endpoints.get.action(), 2);
                test.isTrue(route.options.authRequired);
                test.equal(route.options.roleRequired, 'admin');
                test.isUndefined(route.endpoints.get.authRequired);
                return test.isUndefined(route.endpoints.get.roleRequired);
            });
            return it('should be configurable', function(test) {
                var config;
                EasyApi.configure({
                    apiPath: 'api/v1',
                    useAuth: true,
                    defaultHeaders: {
                        'Content-Type': 'text/json',
                        'X-Test-Header': 'test header'
                    }
                });
                config = EasyApi.config;
                test.equal(config.apiPath, 'api/v1/');
                test.equal(config.useAuth, true);
                test.equal(config.auth.token, 'services.resume.loginTokens.hashedToken');
                test.equal(config.defaultHeaders['Content-Type'], 'text/json');
                test.equal(config.defaultHeaders['X-Test-Header'], 'test header');
                return test.equal(config.defaultHeaders['Access-Control-Allow-Origin'], '*');
            });
        });
        return context('that has been configured', function() {
            it('should not allow reconfiguration', function(test) {
                return test.throws(EasyApi.configure, 'EasyApi.configure() can only be called once');
            });
            it('should configure any previously added routes', function(test) {
                var route;
                route = EasyApi.routes[2];
                test.equal(route.endpoints.get.action(), 1);
                test.isTrue(route.endpoints.get.authRequired);
                return test.equal(route.endpoints.get.roleRequired, ['admin']);
            });
            return it('should configure any previously added collection routes', function(test) {
                var route;
                route = EasyApi.routes[3];
                test.equal(route.endpoints.get.action(), 2);
                test.isTrue(route.endpoints.get.authRequired);
                return test.equal(route.endpoints.get.roleRequired, ['admin']);
            });
        });
    });
    describe('A collection route', function() {
        it('should be able to exclude endpoints using just the excludedEndpoints option', function(test, next) {
            EasyApi.addCollection(new Mongo.Collection('tests2'), {
                excludedEndpoints: ['get', 'getAll']
            });
            HTTP.get('http://localhost:3000/api/v1/tests2/10', function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.isTrue(error);
                test.equal(result.statusCode, 404);
                test.equal(response.status, 'error');
                return test.equal(response.message, 'API endpoint not found');
            });
            return HTTP.get('http://localhost:3000/api/v1/tests2/', function(error, result) {
                var response;
                response = JSON.parse(result.content);
                test.isTrue(error);
                test.equal(result.statusCode, 404);
                test.equal(response.status, 'error');
                test.equal(response.message, 'API endpoint not found');
                return next();
            });
        });
        return context('with the default autogenerated endpoints', function() {
            var testId;
            EasyApi.addCollection(new Mongo.Collection('testautogen'));
            testId = null;
            it('should support a POST on api/collection', function(test) {
                var response, responseData, result;
                result = HTTP.post('http://localhost:3000/api/v1/testAutogen', {
                    data: {
                        name: 'test name',
                        description: 'test description'
                    }
                });
                response = JSON.parse(result.content);
                responseData = response.data;
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                test.equal(responseData.name, 'test name');
                test.equal(responseData.description, 'test description');
                return testId = responseData._id;
            });
            return it('should support a PUT on api/collection/:id', function(test) {
                var response, responseData, result;
                result = HTTP.put("http://localhost:3000/api/v1/testAutogen/" + testId, {
                    data: {
                        name: 'update name',
                        description: 'update description'
                    }
                });
                response = JSON.parse(result.content);
                responseData = response.data;
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                test.equal(responseData.name, 'update name');
                test.equal(responseData.description, 'update description');
                result = HTTP.put("http://localhost:3000/api/v1/testAutogen/" + testId, {
                    data: {
                        name: 'update name with no description'
                    }
                });
                response = JSON.parse(result.content);
                responseData = response.data;
                test.equal(result.statusCode, 200);
                test.equal(response.status, 'success');
                test.equal(responseData.name, 'update name with no description');
                return test.isUndefined(responseData.description);
            });
        });
    });
    return describe('An endpoint', function() {
        it('should respond with the default headers when not overridden', function(test) {
            var result;
            EasyApi.addRoute('testDefaultHeaders', {
                get: function() {
                    return true;
                }
            });
            result = HTTP.get('http://localhost:3000/api/v1/testDefaultHeaders');
            test.equal(result.statusCode, 200);
            test.equal(result.headers['content-type'], 'text/json');
            test.equal(result.headers['x-test-header'], 'test header');
            test.equal(result.headers['access-control-allow-origin'], '*');
            return test.isTrue(result.content);
        });
        it('should allow default headers to be overridden', function(test) {
            var result;
            EasyApi.addRoute('testOverrideDefaultHeaders', {
                get: function() {
                    return {
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': 'https://mywebsite.com'
                        },
                        body: true
                    };
                }
            });
            result = HTTP.get('http://localhost:3000/api/v1/testOverrideDefaultHeaders');
            test.equal(result.statusCode, 200);
            test.equal(result.headers['content-type'], 'application/json');
            test.equal(result.headers['access-control-allow-origin'], 'https://mywebsite.com');
            return test.isTrue(result.content);
        });
        it('should cause an error when it returns null', function(test, next) {
            EasyApi.addRoute('testNullResponse', {
                get: function() {
                    return null;
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testNullResponse', function(error, result) {
                test.isTrue(error);
                test.equal(result.statusCode, 500);
                return next();
            });
        });
        it('should cause an error when it returns undefined', function(test, next) {
            EasyApi.addRoute('testUndefinedResponse', {
                get: function() {
                    return void 0;
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testUndefinedResponse', function(error, result) {
                test.isTrue(error);
                test.equal(result.statusCode, 500);
                return next();
            });
        });
        it('should be able to handle it\'s response manually', function(test, next) {
            EasyApi.addRoute('testManualResponse', {
                get: function() {
                    this.response.write('Testing manual response.');
                    this.response.end();
                    return this.done();
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testManualResponse', function(error, result) {
                var response;
                response = result.content;
                test.equal(result.statusCode, 200);
                test.equal(response, 'Testing manual response.');
                return next();
            });
        });
        it('should not have to call this.response.end() when handling the response manually', function(test, next) {
            EasyApi.addRoute('testManualResponseNoEnd', {
                get: function() {
                    this.response.write('Testing this.end()');
                    return this.done();
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testManualResponseNoEnd', function(error, result) {
                var response;
                response = result.content;
                test.isFalse(error);
                test.equal(result.statusCode, 200);
                test.equal(response, 'Testing this.end()');
                return next();
            });
        });
        it('should be able to send it\'s response in chunks', function(test, next) {
            EasyApi.addRoute('testChunkedResponse', {
                get: function() {
                    this.response.write('Testing ');
                    this.response.write('chunked response.');
                    return this.done();
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testChunkedResponse', function(error, result) {
                var response;
                response = result.content;
                test.equal(result.statusCode, 200);
                test.equal(response, 'Testing chunked response.');
                return next();
            });
        });
        it('should respond with an error if this.done() isn\'t called after response is handled manually', function(test, next) {
            EasyApi.addRoute('testManualResponseWithoutDone', {
                get: function() {
                    return this.response.write('Testing');
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testManualResponseWithoutDone', function(error, result) {
                test.isTrue(error);
                test.equal(result.statusCode, 500);
                return next();
            });
        });
        it('should not wrap text with quotes when response Content-Type is text/plain', function(test, next) {
            EasyApi.addRoute('testPlainTextResponse', {
                get: function() {
                    return {
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: 'foo"bar'
                    };
                }
            });
            return HTTP.get('http://localhost:3000/api/v1/testPlainTextResponse', function(error, result) {
                var response;
                response = result.content;
                test.equal(result.statusCode, 200);
                test.equal(response, 'foo"bar');
                return next();
            });
        });
        return it('should have its context set', function(test) {
            var result;
            EasyApi.addRoute('testContext/:test', {
                post: function() {
                    test.equal(this.urlParams.test, '100');
                    test.equal(this.queryParams.test, "query");
                    test.equal(this.bodyParams.test, "body");
                    test.isNotNull(this.request);
                    test.isNotNull(this.response);
                    test.isTrue(_.isFunction(this.done));
                    test.isFalse(this.authRequired);
                    test.isFalse(this.roleRequired);
                    return true;
                }
            });
            result = HTTP.post('http://localhost:3000/api/v1/testContext/100?test=query', {
                data: {
                    test: 'body'
                }
            });
            test.equal(result.statusCode, 200);
            return test.isTrue(result.content);
        });
    });
});