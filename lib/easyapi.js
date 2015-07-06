var EasyApi,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

this.EasyApi = (function() {
    function EasyApi() {
        this.configure = bind(this.configure, this);
        this.routes = [];
        this.config = {
            paths: [],
            useAuth: false,
            apiPath: 'api/',
            version: 1,
            prettyJson: false,
            auth: {
                token: 'services.resume.loginTokens.hashedToken',
                user: function() {
                    return {
                        userId: this.request.headers['x-user-id'],
                        token: Accounts._hashLoginToken(this.request.headers['x-auth-token'])
                    };
                }
            },
            onLoggedIn: function() {
                return {};
            },
            onLoggedOut: function() {
                return {};
            },
            useClientRouter: true,
            defaultHeaders: {
                'Content-Type': 'application/json'
            },
            enableCors: true
        };
        this.configured = false;
    }


    /**
     Configure the ReST API

     Must be called exactly once, from anywhere on the server.
     */

    EasyApi.prototype.configure = function(config) {
        if (this.configured) {
            throw new Error('EasyApi.configure() can only be called once');
        }
        this.configured = true;
        _.extend(this.config, config);
        if (this.config.enableCors) {
            _.extend(this.config.defaultHeaders, {
                'Access-Control-Allow-Origin': '*'
            });
        }
        if (this.config.apiPath[0] === '/') {
            this.config.apiPath = this.config.apiPath.slice(1);
        }
        if (_.last(this.config.apiPath) !== '/') {
            this.config.apiPath = this.config.apiPath + '/';
        }
        if (!this.config.useClientRouter && Meteor.isClient) {
            Router.options.autoStart = false;
        }
        _.each(this.routes, function(route) {
            return route.addToApi();
        });
        if (this.config.useAuth) {
            this._initAuth();
            console.log("EasyApi configured at " + this.config.apiPath + " with authentication");
        } else {
            console.log("EasyApi configured at " + this.config.apiPath + " without authentication");
        }
    };


    /**
     Add endpoints for the given HTTP methods at the given path
     */

    EasyApi.prototype.addRoute = function(path, options, methods) {
        var route;
        route = new Route(this, path, options, methods);
        this.routes.push(route);
        if (this.configured) {
            route.addToApi();
        }
    };


    /**
     Generate routes for the Meteor Collection with the given name
     */

    EasyApi.prototype.addCollection = function(collection, options) {
        var collectionEndpoints, collectionRouteEndpoints, endpointsAwaitingConfiguration, entityRouteEndpoints, excludedEndpoints, methods, methodsOnCollection, path, routeOptions;
        if (options == null) {
            options = {};
        }
        methods = ['get', 'post', 'put', 'delete', 'getAll', 'deleteAll'];
        methodsOnCollection = ['post', 'getAll', 'deleteAll'];
        if (collection === Meteor.users) {
            collectionEndpoints = this._userCollectionEndpoints;
        } else {
            collectionEndpoints = this._collectionEndpoints;
        }
        endpointsAwaitingConfiguration = options.endpoints || {};
        routeOptions = options.routeOptions || {};
        excludedEndpoints = options.excludedEndpoints || [];
        path = options.path || collection._name;
        collectionRouteEndpoints = {};
        entityRouteEndpoints = {};
        if (_.isEmpty(endpointsAwaitingConfiguration) && _.isEmpty(excludedEndpoints)) {
            _.each(methods, function(method) {
                if (indexOf.call(methodsOnCollection, method) >= 0) {
                    _.extend(collectionRouteEndpoints, collectionEndpoints[method].call(this, collection));
                } else {
                    _.extend(entityRouteEndpoints, collectionEndpoints[method].call(this, collection));
                }
            }, this);
        } else {
            _.each(methods, function(method) {
                var configuredEndpoint, endpointOptions;
                if (indexOf.call(excludedEndpoints, method) < 0 && endpointsAwaitingConfiguration[method] !== false) {
                    endpointOptions = endpointsAwaitingConfiguration[method];
                    configuredEndpoint = {};
                    _.each(collectionEndpoints[method].call(this, collection), function(action, methodType) {
                        return configuredEndpoint[methodType] = _.chain(action).clone().extend(endpointOptions).value();
                    });
                    if (indexOf.call(methodsOnCollection, method) >= 0) {
                        _.extend(collectionRouteEndpoints, configuredEndpoint);
                    } else {
                        _.extend(entityRouteEndpoints, configuredEndpoint);
                    }
                }
            }, this);
        }
        this.addRoute(path, routeOptions, collectionRouteEndpoints);
        this.addRoute(path + "/:id", routeOptions, entityRouteEndpoints);
    };


    /**
     A set of endpoints that can be applied to a Collection Route
     */

    EasyApi.prototype._collectionEndpoints = {
        get: function(collection) {
            return {
                get: {
                    action: function() {
                        var entity;
                        entity = collection.findOne(this.urlParams.id);
                        if (entity) {
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "Item not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        put: function(collection) {
            return {
                put: {
                    action: function() {
                        var entity, entityIsUpdated;
                        entityIsUpdated = collection.update(this.urlParams.id, this.bodyParams);
                        if (entityIsUpdated) {
                            entity = collection.findOne(this.urlParams.id);
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "Item not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        "delete": function(collection) {
            return {
                "delete": {
                    action: function() {
                        if (collection.remove(this.urlParams.id)) {
                            return {
                                status: "success",
                                data: {
                                    message: "Item removed"
                                }
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "Item not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        post: function(collection) {
            return {
                post: {
                    action: function() {
                        var entity, entityId;
                        entityId = collection.insert(this.bodyParams);
                        entity = collection.findOne(entityId);
                        if (entity) {
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            ({
                                statusCode: 400
                            });
                            return {
                                status: "fail",
                                message: "No item added"
                            };
                        }
                    }
                }
            };
        },
        getAll: function(collection) {
            return {
                get: {
                    action: function() {
                        var entities;
                        entities = collection.find().fetch();
                        if (entities) {
                            return {
                                status: "success",
                                data: entities
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "Unable to retrieve items from collection"
                                }
                            };
                        }
                    }
                }
            };
        },
        deleteAll: function(collection) {
            return {
                "delete": {
                    action: function() {
                        var itemsRemoved;
                        itemsRemoved = collection.remove({});
                        if (itemsRemoved) {
                            return {
                                status: "success",
                                data: {
                                    message: "Removed " + itemsRemoved + " items"
                                }
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "No items found"
                                }
                            };
                        }
                    }
                }
            };
        }
    };


    /**
     A set of endpoints that can be applied to a Meteor.users Collection Route
     */

    EasyApi.prototype._userCollectionEndpoints = {
        get: function(collection) {
            return {
                get: {
                    action: function() {
                        var entity;
                        entity = collection.findOne(this.urlParams.id, {
                            fields: {
                                profile: 1
                            }
                        });
                        if (entity) {
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "User not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        put: function(collection) {
            return {
                put: {
                    action: function() {
                        var entity, entityIsUpdated;
                        entityIsUpdated = collection.update(this.urlParams.id, {
                            $set: {
                                profile: this.bodyParams
                            }
                        });
                        if (entityIsUpdated) {
                            entity = collection.findOne(this.urlParams.id, {
                                fields: {
                                    profile: 1
                                }
                            });
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "User not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        "delete": function(collection) {
            return {
                "delete": {
                    action: function() {
                        if (collection.remove(this.urlParams.id)) {
                            return {
                                status: "success",
                                data: {
                                    message: "User removed"
                                }
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "User not found"
                                }
                            };
                        }
                    }
                }
            };
        },
        post: function(collection) {
            return {
                post: {
                    action: function() {
                        var entity, entityId;
                        entityId = Accounts.createUser(this.bodyParams);
                        entity = collection.findOne(entityId, {
                            fields: {
                                profile: 1
                            }
                        });
                        if (entity) {
                            return {
                                status: "success",
                                data: entity
                            };
                        } else {
                            ({
                                statusCode: 400
                            });
                            return {
                                status: "fail",
                                message: "No user added"
                            };
                        }
                    }
                }
            };
        },
        getAll: function(collection) {
            return {
                get: {
                    action: function() {
                        var entities;
                        entities = collection.find({}, {
                            fields: {
                                profile: 1
                            }
                        }).fetch();
                        if (entities) {
                            return {
                                status: "success",
                                data: entities
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "Unable to retrieve users"
                                }
                            };
                        }
                    }
                }
            };
        },
        deleteAll: function(collection) {
            return {
                "delete": {
                    action: function() {
                        var usersRemoved;
                        usersRemoved = collection.remove({});
                        if (usersRemoved) {
                            return {
                                status: "success",
                                data: {
                                    message: "Removed " + usersRemoved + " users"
                                }
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: {
                                    status: "fail",
                                    message: "No users found"
                                }
                            };
                        }
                    }
                }
            };
        }
    };


    /*
     Add /login and /logout endpoints to the API
     */

    EasyApi.prototype._initAuth = function() {
        var self;
        self = this;

        /*
         Add a login endpoint to the API

         After the user is logged in, the onLoggedIn hook is called (see Restfully.configure() for adding hook).
         */
        this.addRoute('login', {
            authRequired: false
        }, {
            post: function() {
                var auth, e, ref, searchQuery, user;
                user = {};
                if (this.bodyParams.user.indexOf('@') === -1) {
                    user.username = this.bodyParams.user;
                } else {
                    user.email = this.bodyParams.user;
                }
                try {
                    auth = Auth.loginWithPassword(user, this.bodyParams.password);
                } catch (_error) {
                    e = _error;
                    return {
                        statusCode: e.error,
                        body: {
                            status: "error",
                            message: e.reason
                        }
                    };
                }
                if (auth.userId && auth.authToken) {
                    searchQuery = {};
                    searchQuery[self.config.auth.token] = Accounts._hashLoginToken(auth.authToken);
                    this.user = Meteor.users.findOne({
                        '_id': auth.userId
                    }, searchQuery);
                    this.userId = (ref = this.user) != null ? ref._id : void 0;
                }
                self.config.onLoggedIn.call(this);
                return {
                    status: "success",
                    data: auth
                };
            }
        });

        /*
         Add a logout endpoint to the API

         After the user is logged out, the onLoggedOut hook is called (see Restfully.configure() for adding hook).
         */
        return this.addRoute('logout', {
            authRequired: true
        }, {
            get: function() {
                var authToken, hashedToken, index, ref, tokenFieldName, tokenLocation, tokenPath, tokenRemovalQuery, tokenToRemove;
                authToken = this.request.headers['x-auth-token'];
                hashedToken = Accounts._hashLoginToken(authToken);
                tokenLocation = self.config.auth.token;
                index = tokenLocation.lastIndexOf('.');
                tokenPath = tokenLocation.substring(0, index);
                tokenFieldName = tokenLocation.substring(index + 1);
                tokenToRemove = {};
                tokenToRemove[tokenFieldName] = hashedToken;
                tokenRemovalQuery = {};
                tokenRemovalQuery[tokenPath] = tokenToRemove;
                Meteor.users.update(this.user._id, {
                    $pull: tokenRemovalQuery
                });
                if ((ref = self.config.onLoggedOut) != null) {
                    ref.call(this);
                }
                return {
                    status: "success",
                    data: {
                        message: 'You\'ve been logged out!'
                    }
                };
            }
        });
    };

    return EasyApi;

})();

EasyApi = new this.EasyApi;