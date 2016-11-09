/* jshint globalstrict: true */

// method
// custome request headers
// get response headers
// support promise
function $HttpProvider() {
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
        withCredentials: false
    };

    this.defaults = defaults;

    this.$get = ['$httpBackend', '$q', '$rootScope', function ($httpBackend, $q, $rootScope) {
        function $http(requestConfig) {
            var d = $q.defer();
            var config = _.extend({
                method: 'GET',
                transformRequest: defaults.transformRequest
            }, requestConfig);
            config.headers = mergeHeaders(requestConfig);

            var reqData = transformData(
                config.data,
                headersGetter(config.headers),
                config.transformRequest
            );
            if (_.isUndefined(reqData)) {
                removeContentType(config.headers);
            }
            // 作者这里的实现是。 config.withCredentials === undefined, 并且 defaults.withCredentials !== undefined
            if (!_.has(config, 'withCredentials')) {
                config.withCredentials = defaults.withCredentials;
            }


            $httpBackend(
                config.method,
                config.url,
                reqData,
                done,
                config.headers,
                config.withCredentials
            );

            return d.promise;

            function done(status, response, headerString, statusText) {
                status = Math.max(status, 0);
                d[isSuccess(status) ? 'resolve' : 'reject']({
                    status: status,
                    data: response,
                    statusText: statusText,
                    headers: headersGetter(headerString),
                    config: config
                });
                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
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

            function removeContentType(headers) {
                _.forEach(config.headers, function (v, k) {
                    if (k.toLowerCase() === 'content-type') {
                        delete headers[k];
                    }
                });
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

            function transformData(data, headers, transformFn) {
                if (_.isFunction(transformFn)) {
                    return transformFn(data);
                } else if (_.isArray(transformFn)) {
                    return _.reduce(transformFn, function (preData, fn) {
                        return _.isFunction(fn) ? fn(preData, headers) : preData;
                    }, data);
                } else {
                    return data;
                }
            }
        }

        $http.defaults = defaults;

        return $http;
    }];
}
