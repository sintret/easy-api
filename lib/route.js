this.Route = (function() {
    function Route(api, path, options, endpoints1) {
        this.api = api;
        this.path = path;
        this.options = options;
        this.endpoints = endpoints1;
        if (!this.endpoints) {
            this.endpoints = this.options;
            this.options = {};
        }
    }

    Route.prototype.addToApi = function() {
        var fullPath, self;
        self = this;
        if (_.contains(this.api.config.paths, this.path)) {
            throw new Error("Cannot add a route at an existing path: " + this.path);
        }
        this._resolveEndpoints();
        this._configureEndpoints();
        this.api.config.paths.push(this.path);
        fullPath = this.api.config.apiPath + this.path;
        return Router.route(fullPath, {
            where: 'server',
            action: function() {
                var method, responseData;
                this.urlParams = this.params;
                this.queryParams = this.params.query;
                this.bodyParams = this.request.body;
                this.done = (function(_this) {
                    return function() {
                        return _this._responseInitiated = true;
                    };
                })(this);
                responseData = null;
                method = this.request.method;
                if (self.endpoints[method.toLowerCase()]) {
                    _.extend(this, self.endpoints[method.toLowerCase()]);
                    responseData = self._callEndpoint(this, self.endpoints[method.toLowerCase()]);
                } else {
                    responseData = {
                        statusCode: 404,
                        body: {
                            status: "error",
                            message: 'API endpoint not found'
                        }
                    };
                }
                if (responseData === null || responseData === void 0) {
                    throw new Error("Cannot return null or undefined from an endpoint: " + method + " " + fullPath);
                }
                if (this.response.headersSent && !this._responseInitiated) {
                    throw new Error("Must call this.done() after handling endpoint response manually: " + method + " " + fullPath);
                }
                if (this._responseInitiated) {
                    this.response.end();
                    return;
                }
                if (responseData.body && (responseData.statusCode || responseData.headers)) {
                    return self._respond(this, responseData.body, responseData.statusCode, responseData.headers);
                } else {
                    return self._respond(this, responseData);
                }
            }
        });
    };


    /*
     Convert all endpoints on the given route into our expected endpoint object if it is a bare function

     @param {Route} route The route the endpoints belong to
     */

    Route.prototype._resolveEndpoints = function() {
        _.each(this.endpoints, function(endpoint, method, endpoints) {
            if (_.isFunction(endpoint)) {
                return endpoints[method] = {
                    action: endpoint
                };
            }
        });
    };


    /*
     Configure the authentication and role requirement on an endpoint

     Once it's globally configured in the API, authentication can be required on an entire route or individual
     endpoints. If required on an entire route, that serves as the default. If required in any individual endpoints, that
     will override the default.

     After the endpoint is configured, all authentication and role requirements of an endpoint can be accessed at
     <code>endpoint.authRequired</code> and <code>endpoint.roleRequired</code>, respectively.

     @param {Route} route The route the endpoints belong to
     @param {Endpoint} endpoint The endpoint to configure
     */

    Route.prototype._configureEndpoints = function() {
        _.each(this.endpoints, function(endpoint) {
            var ref, ref1;
            if (!((ref = this.options) != null ? ref.roleRequired : void 0)) {
                this.options.roleRequired = [];
            }
            if (!endpoint.roleRequired) {
                endpoint.roleRequired = [];
            }
            endpoint.roleRequired = _.union(endpoint.roleRequired, this.options.roleRequired);
            if (_.isEmpty(endpoint.roleRequired)) {
                endpoint.roleRequired = false;
            }
            if (!this.api.config.useAuth) {
                endpoint.authRequired = false;
            } else if (endpoint.authRequired === void 0) {
                if (((ref1 = this.options) != null ? ref1.authRequired : void 0) || endpoint.roleRequired) {
                    endpoint.authRequired = true;
                } else {
                    endpoint.authRequired = false;
                }
            }
        }, this);
    };


    /*
     Authenticate an endpoint if required, and return the result of calling it

     @returns The endpoint response or a 401 if authentication fails
     */

    Route.prototype._callEndpoint = function(endpointContext, endpoint) {
        if (this._authAccepted(endpointContext, endpoint)) {
            if (this._roleAccepted(endpointContext, endpoint)) {
                return endpoint.action.call(endpointContext);
            } else {
                return {
                    statusCode: 401,
                    body: {
                        status: "error",
                        message: "You do not have permission to do this."
                    }
                };
            }
        } else {
            return {
                statusCode: 401,
                body: {
                    status: "error",
                    message: "You must be logged in to do this."
                }
            };
        }
    };


    /*
     Authenticate the given endpoint if required

     Once it's globally configured in the API, authentication can be required on an entire route or individual
     endpoints. If required on an entire endpoint, that serves as the default. If required in any individual endpoints, that
     will override the default.

     @returns False if authentication fails, and true otherwise
     */

    Route.prototype._authAccepted = function(endpointContext, endpoint) {
        if (endpoint.authRequired) {
            return this._authenticate(endpointContext);
        } else {
            return true;
        }
    };


    /*
     Verify the request is being made by an actively logged in user

     If verified, attach the authenticated user to the context.

     @returns {Boolean} True if the authentication was successful
     */

    Route.prototype._authenticate = function(endpointContext) {
        var auth, userSelector;
        auth = this.api.config.auth.user.call(endpointContext);
        if ((auth != null ? auth.userId : void 0) && (auth != null ? auth.token : void 0) && !(auth != null ? auth.user : void 0)) {
            userSelector = {};
            userSelector._id = auth.userId;
            userSelector[this.api.config.auth.token] = auth.token;
            auth.user = Meteor.users.findOne(userSelector);
        }
        if (auth != null ? auth.user : void 0) {
            endpointContext.user = auth.user;
            endpointContext.userId = auth.user._id;
            return true;
        } else {
            return false;
        }
    };


    /*
     Authenticate the user role if required

     Must be called after _authAccepted().

     @returns True if the authenticated user belongs to <i>any</i> of the acceptable roles on the endpoint
     */

    Route.prototype._roleAccepted = function(endpointContext, endpoint) {
        if (endpoint.roleRequired) {
            if (_.isEmpty(_.intersection(endpoint.roleRequired, endpointContext.user.roles))) {
                return false;
            }
        }
        return true;
    };


    /*
     Respond to an HTTP request
     */

    Route.prototype._respond = function(endpointContext, body, statusCode, headers) {
        var defaultHeaders, delayInMilliseconds, minimumDelayInMilliseconds, randomMultiplierBetweenOneAndTwo, sendResponse;
        if (statusCode == null) {
            statusCode = 200;
        }
        if (headers == null) {
            headers = {};
        }
        defaultHeaders = this._lowerCaseKeys(this.api.config.defaultHeaders);
        headers = this._lowerCaseKeys(headers);
        headers = _.extend(defaultHeaders, headers);
        if (headers['content-type'].match(/json|javascript/) !== null) {
            if (this.api.config.prettyJson) {
                body = JSON.stringify(body, void 0, 2);
            } else {
                body = JSON.stringify(body);
            }
        }
        sendResponse = function() {
            endpointContext.response.writeHead(statusCode, headers);
            endpointContext.response.write(body);
            return endpointContext.response.end();
        };
        if (statusCode === 401 || statusCode === 403) {
            minimumDelayInMilliseconds = 500;
            randomMultiplierBetweenOneAndTwo = 1 + Math.random();
            delayInMilliseconds = minimumDelayInMilliseconds * randomMultiplierBetweenOneAndTwo;
            return Meteor.setTimeout(sendResponse, delayInMilliseconds);
        } else {
            return sendResponse();
        }
    };


    /*
     Return the object with all of the keys converted to lowercase
     */

    Route.prototype._lowerCaseKeys = function(object) {
        return _.chain(object).pairs().map(function(attr) {
            return [attr[0].toLowerCase(), attr[1]];
        }).object().value();
    };

    return Route;

})();