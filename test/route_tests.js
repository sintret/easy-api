if (Meteor.isServer) {
    describe('A route', function() {
        it('can be constructed with options', function(test) {
            var route;
            route = new this.Route(new this.Restivus, 'test-route-1', {
                authRequired: true,
                roleRequired: ['admin', 'dev']
            }, {
                get: function() {
                    return 'GET test-route-1';
                }
            });
            test.equal(route.path, 'test-route-1');
            test.isTrue(route.options.authRequired);
            test.isTrue(_.contains(route.options.roleRequired, 'admin'));
            test.isTrue(_.contains(route.options.roleRequired, 'dev'));
            return test.equal(route.endpoints.get(), 'GET test-route-1');
        });
        it('can be constructed without options', function(test) {
            var route;
            route = new this.Route(new this.Restivus, 'test-route-2', {
                get: function() {
                    return 'GET test-route-2';
                }
            });
            test.equal(route.path, 'test-route-2');
            return test.equal(route.endpoints.get(), 'GET test-route-2');
        });
        it('should support endpoints for all HTTP methods', function(test) {
            var route;
            route = new this.Route(new this.Restivus, 'test-route-3', {
                get: function() {
                    return 'GET test-route-2';
                },
                post: function() {
                    return 'POST test-route-2';
                },
                put: function() {
                    return 'PUT test-route-2';
                },
                patch: function() {
                    return 'PATCH test-route-2';
                },
                "delete": function() {
                    return 'DELETE test-route-2';
                },
                options: function() {
                    return 'OPTIONS test-route-2';
                }
            });
            test.equal(route.endpoints.get(), 'GET test-route-2');
            test.equal(route.endpoints.post(), 'POST test-route-2');
            test.equal(route.endpoints.put(), 'PUT test-route-2');
            test.equal(route.endpoints.patch(), 'PATCH test-route-2');
            test.equal(route.endpoints["delete"](), 'DELETE test-route-2');
            return test.equal(route.endpoints.options(), 'OPTIONS test-route-2');
        });
        return context('that\'s initialized without options', function() {
            return it('should have the default configuration', function(test) {
                test.equal(Restivus.config.apiPath, 'api/');
                test.isFalse(Restivus.config.useAuth);
                test.isFalse(Restivus.config.prettyJson);
                return test.equal(Restivus.config.auth.token, 'services.resume.loginTokens.hashedToken');
            });
        });
    });
}
RunLink