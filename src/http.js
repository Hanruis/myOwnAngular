/* jshint globalstrict: true */

// method
// custome request headers
// get response headers
// support promise
function $HttpProvider() {
    function isBlob(object) {
        return object.toString() === '[object Blob]';
    }

    function isFile(object) {
        return object.toString() === '[object File]';
    }

    function isFormData(object) {
        return object.toString() === '[object FormData]';
    }

    function isJSONLike(str) {
        if (/^\{(?!\{)/.test(str)) {
            return /\}$/.test(str);
        } else if (/^\[/.test(str)) {
            return /\]$/.test(str);
        }
        return false;
    }

    function transformData(data, headers, transformFn, status) {
        if (_.isFunction(transformFn)) {
            return transformFn(data, headers, status);
        } else if (_.isArray(transformFn)) {
            return _.reduce(transformFn, function (preData, fn) {
                return _.isFunction(fn) ? fn(preData, headers, status) : preData;
            }, data);
        } else {
            return data;
        }
    }

    /**
     * @param {string} url string
     * @param {string} serializedParams url params string
     * @return {string} url compelte string
     */
    function buildUrl(url, serializedParams) {
        if (serializedParams.length) {
            if (_.isString(url)) {
                return url + (url.indexOf('?') >= 0 ? '&' : '?') + serializedParams;
            }
        } else {
            return url;
        }

        return '';
    }

    // 这里为什么不考虑 302 的问题？
    // 因为遇到了 302 ，浏览器会自行处理这个资源，不会去到我们的 js 代码中来处理。
    function isSuccess(status) {
        return status >= 200 && status < 300;
    }

    function mergeHeaders(config) {
        var reqHeaders = _.extend({}, config.headers);
        var defHeaders = _.extend({},
            defaults.headers.common,
            defaults.headers[(config.method || 'get').toLowerCase()]
        );

        _.forEach(defHeaders, function (value, key) {
            var headerExists = _.some(reqHeaders, function (v, k) {
                return k.toLowerCase() === key.toLowerCase();
            });

            if (!headerExists) {
                reqHeaders[key] = value;
            }
        });
        return executeHeaderFns(reqHeaders, config);
    }

    function executeHeaderFns(headers, config) {
        return _.transform(headers, function (result, v, k) {
            if (_.isFunction(v)) {
                v = v(config);
                if (_.isNull(v) || _.isUndefined(v)) {
                    delete result[k];
                } else {
                    result[k] = v;
                }
            }
        }, headers);
    }

    function headersGetter(headers) {
        // parse headerString
        var headersObj;

        return function (key) {
            headersObj = headersObj || parseHeaders(headers);
            return key ? headersObj[key.toLowerCase()] : headersObj;
        };
    }

    function parseHeaders(headers) {
        if (_.isObject(headers)) {
            return _.transform(headers, function (result, v, k) {
                result[_.trim(k.toLowerCase())] = _.trim(v);
            }, {});
        }

        var lines = headers.split('\n');
        return _.transform(lines, function (result, line) {
            var pairs = line.split(':');
            var key = _.trim(pairs[0].toLowerCase());
            var value = _.trim(pairs[1]);
            if (key) {
                result[key] = value;
            }
        }, {});
    }


    // 开始 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    var defaults = {
        headers: {
            common: {
                Accept: 'application/json, text/plain, */*'
            },
            post: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            put: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            patch: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        },
        withCredentials: false,
        transformRequest: [function (data) {
            if (_.isObject(data) && !isBlob(data) && !isFile(data) && !isFormData(data)) {
                return JSON.stringify(data);
            } else {
                return data;
            }
        }],
        transformResponse: [function (data, headers, status) {
            if (_.isString(data)) {
                var contentType = headers('content-type');
                if (contentType && contentType.indexOf('application/json') === 0 || isJSONLike(data)) {
                    return JSON.parse(data);
                }
            }

            return data;
        }],
        paramSerializer: '$httpParamSerializer'
    };

    var interceptorFactoryies = this.interceptors = [];

    this.defaults = defaults;

    var useApplyAsync = false;
    this.useApplyAsync = function (value) {
        if (_.isUndefined(value)) {
            return useApplyAsync;
        } else {
            useApplyAsync = !!value;
            return this;
        }
    };

    this.$get = ['$httpBackend', '$q', '$rootScope', '$injector', '$httpParamSerializer', function ($httpBackend, $q, $rootScope, $injector, $httpParamSerializer) {
        var interceptors = _.map(interceptorFactoryies, function (fn) {
            return _.isString(fn) ? $injector.get(fn) : $injector.invoke(fn);
        });


        $http.defaults = defaults;
        $http.pendingRequests = [];
        _.forEach(['get', 'head', 'delete'], function (method) {
            $http[method] = function (url, config) {
                return $http(_.extend(config, {
                    method: method.toUpperCase(),
                    url: url
                }));
            };
        });
        _.forEach(['post', 'put', 'patch'], function (method) {
            $http[method] = function (url, data, config) {
                $http(_.extend(config || {}, {
                    url: url,
                    data: data,
                    method: method.toUpperCase()
                }));
            };
        });

        function $http(requestConfig) {
            var config = _.extend({
                method: 'GET',
                transformRequest: defaults.transformRequest,
                transformResponse: defaults.transformResponse,
                paramSerializer: $httpParamSerializer
            }, requestConfig);
            if (_.isString(config.paramSerializer)) {
                config.paramSerializer = $injector.get(config.paramSerializer);
            }
            config.headers = mergeHeaders(requestConfig);

            var promise = $q.when(config);

            promise = _.reduce(interceptors, function (prevPromise, interceptor) {
                return prevPromise.then(interceptor.request, interceptor.requestError);
            }, promise);

            promise = promise.then(serverRequest);

            promise = _.reduceRight(interceptors, function (prevPromise, interceptor) {
                return prevPromise.then(interceptor.response, interceptor.responseError);
            }, promise);

            promise.success = function (fn) {
                promise.then(function (response) {
                    fn(response.data, response.status, response.headers, config);
                });
                return promise;
            };
            promise.error = function (fn) {
                promise.catch(function (response) {
                    fn(response.data, response.status, response.headers, config);
                });
                return promise;
            };

            return promise;
        }

        function sendReq(config, reqData) {
            var d = $q.defer();
            var url = buildUrl(config.url, config.paramSerializer(config.params));

            $http.pendingRequests.push(config);
            d.promise.then(function () {
                _.remove($http.pendingRequests, config);
            }, function () {
                _.remove($http.pendingRequests, config);
            });

            $httpBackend(
                config.method,
                url,
                reqData,
                done,
                config.headers,
                config.timeout,
                config.withCredentials
            );

            function done(status, response, headerString, statusText) {
                status = Math.max(status, 0);

                function resolvePromise() {
                    d[isSuccess(status) ? 'resolve' : 'reject']({
                        status: status,
                        data: response,
                        statusText: statusText,
                        headers: headersGetter(headerString),
                        config: config
                    });
                }

                if (useApplyAsync) {
                    $rootScope.$applyAsync(resolvePromise);
                } else {
                    resolvePromise();
                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            }

            return d.promise;
        }


        function serverRequest(config) {
            // 作者这里的实现是。 config.withCredentials === undefined, 并且 defaults.withCredentials !== undefined
            if (!_.has(config, 'withCredentials')) {
                config.withCredentials = defaults.withCredentials;
            }
            var reqData = transformData(
                config.data,
                headersGetter(config.headers),
                config.transformRequest
            );
            if (_.isUndefined(reqData)) {
                removeContentType(config.headers);
            }

            return sendReq(config, reqData).then(transformResponse, transformResponse);

            function transformResponse(response) {
                if (response.data) {
                    response.data = transformData(
                        response.data,
                        response.headers,
                        config.transformResponse,
                        response.status
                    );
                }

                if (isSuccess(response.status)) {
                    return response;
                } else {
                    return $q.reject(response);
                }
            }

            function removeContentType(headers) {
                _.forEach(config.headers, function (v, k) {
                    if (k.toLowerCase() === 'content-type') {
                        delete headers[k];
                    }
                });
            }
        }

        return $http;
    }];
}


function $HttpParamSerializerProvider() {
    this.$get = function () {
        return function serializeParams(params) {
            if (_.isString(params)) {
                return params;
            }
            return _.transform(params, function (result, value, key) {
                if (!_.isNull(value) && !_.isUndefined(value)) {
                    if (!_.isArray(value)) {
                        value = [value];
                    }
                    _.forEach(value, function (v) {
                        if (_.isObject(v)) {
                            v = JSON.stringify(v);
                        }
                        result.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
                    });
                }
                return result;
            }, []).join('&');
        };
    };
}

function $HttpParamSerializerJQLikeProvider() {
    this.$get = function () {
        return function (params) {
            var parts = [];


            function serialize(value, prefix, topLevel) {
                if (_.isNull(value) || _.isUndefined(value)) {
                    return;
                }
                if (_.isArray(value)) {
                    _.forEach(value, function (v, i) {
                        serialize(v, prefix + (_.isObject(v) ? '[' + i + ']' : '[]'));
                    });
                } else if (_.isObject(value) && !_.isDate(value)) {
                    _.forEach(value, function (v, k) {
                        serialize(v, prefix + (topLevel ? k : '[' + k + ']'));
                    });
                } else {
                    parts.push(
                        encodeURIComponent(prefix) + '=' + encodeURIComponent(value));
                }
            }

            serialize(params, '', true);
            return parts.join('&');
        };
    };
}
