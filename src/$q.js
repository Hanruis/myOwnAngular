/* jshint globalstrict: true */


function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {
        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFullfilled, onRejected, onProgress) {
            var result = new Deferred();
            this.$$state.pending = this.$$state.pending || [];
            // 这里 result 作为数组的第一项，隐藏着一个作用。
            // 当第一个 promise resolve 之后。如果是 chaining 的。需要把 value 传给第二个 promise
            // 怎么传呢？正常的想法是内部一个数组，保存每个 promise ，然后 resolve 的时候 shift 出来
            // 而这里的做法是，将下一个 promise/deferred 保存在 pending 数组里面。当前 promise resolve 之后
            // 直接通过 result 继续 resolve 给下一个 promise
            this.$$state.pending.push([result, onFullfilled, onRejected, onProgress]);
            if (this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
            return result.promise;
        };

        Promise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.prototype.finally = function (callback, progressCallback) {
            return this.then(function (value) {
                return handlerFinallyCallback(callback, value, true);
            }, function (rejection) {
                return handlerFinallyCallback(callback, rejection, false);
            }, progressCallback);
        };

        function Deferred() {
            this.promise = new Promise();
        }

        Deferred.prototype.resolve = function (value) {
            if (this.promise.$$state.status) {
                return;
            }

            // 如果 resolve ，reject 返回了一个 promise( 已经 resolve/reject, 或者是还未完成的 )
            // 怎么办？
            // 本质上我们其实是需要获取这个 promise 的值，来进行下一个 promise。
            // 这种情况下，通过 then 获取到值之后，继续 resolve 即可
            // 另外，这里为什么不做严格的类型检测呢？
            // --> 为了和其他 promise 库做兼容。只要返回一个 thenable object 即当作是 promise 对象了。
            if (value && _.isFunction(value.then)) {
                value.then(
                    _.bind(this.resolve, this),
                    _.bind(this.reject, this),
                    _.bind(this.notify, this)
                );
            } else {
                this.promise.$$state.value = value;
                this.promise.$$state.status = 1;
                scheduleProcessQueue(this.promise.$$state);
            }
        };

        Deferred.prototype.reject = function (reason) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.value = reason;
            this.promise.$$state.status = 2;
            scheduleProcessQueue(this.promise.$$state);
        };

        Deferred.prototype.notify = function (progress) {
            var pending = this.promise.$$state.pending;
            if (pending && pending.length && !this.promise.$$state.status) {
                $rootScope.$evalAsync(function () {
                    _.forEach(pending, function (handlers) {
                        var progressCallback = handlers[3];
                        var deferred = handlers[0];
                        try {
                            var value = _.isFunction(progressCallback) ? progressCallback(progress) : progress;
                            deferred.notify(value);
                        } catch (error) {
                            console.log(error);
                        }
                    });
                });
            }
        };

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        function processQueue(state) {
            _.forEach(state.pending, function (handlers) {
                // 注意，这里这个 deferred，是下一个 Deferred 了
                var deferred = handlers[0];
                var fn = handlers[state.status];
                try {
                    if (_.isFunction(fn)) {
                        deferred.resolve(fn(state.value));
                    } else if (state.status === 1) {
                        deferred.resolve(state.value);
                    } else if (state.status === 2) {
                        deferred.reject(state.value);
                    }
                } catch (error) {
                    deferred.reject(error);
                }
            });
            // 注意这里不能进行 state.status 的重置。
            // 在设计中， resolve 可以在 promise callback 注册的前后中出现
            // 在 then 和 resolve, reject 中，都会尝试执行 scheduleProcessQueue
            // 其实就是两个状态的判断： 是否有 callback, 是否 resolve/reject
            delete state.pending;
        }

        function defer() {
            return new Deferred();
        }

        function reject(rejecion) {
            var d = defer();
            d.reject(rejecion);
            return d.promise;
        }

        function when(value, callback, errorback, progressback) {
            var d = defer();
            d.resolve(value);
            return d.promise.then(callback, errorback, progressback);
        }

        function resolve(value) {
            return when(value);
        }

        function all(promises) {
            var resolvedCounter = 0;
            var result = _.isArray(promises) ? [] : {};
            var d = defer();

            if (_.isEmpty(promises)) {
                d.resolve(result);
            } else {
                _.forEach(promises, function (promise, index) {
                    resolvedCounter++;
                    when(promise).then(function (value) {
                        resolvedCounter--;
                        result[index] = value;
                        if (!resolvedCounter) {
                            d.resolve(result);
                        }
                    }, function (rejecion) {
                        d.reject(rejecion);
                    });
                });
            }
            return d.promise;
        }

        function makePromise(value, resolved) {
            var d = new Deferred();
            if (resolved) {
                d.resolve(value);
            } else {
                d.reject(value);
            }
            return d.promise;
        }

        function handlerFinallyCallback(callback, value, resolved) {
            var callbackValue = callback();
            if (callbackValue && callbackValue.then) {
                return callbackValue.then(function () {
                    return makePromise(value, resolved);
                });
            }
            return makePromise(value, resolved);
        }

        var $Q = function (resolver) {
            if (!_.isFunction(resolver)) {
                throw 'Expected function, got' + resolver;
            }
            var d = defer();

            resolver(_.bind(d.resolve, d), _.bind(d.reject, d));

            return d.promise;
        };
        return _.extend($Q, {
            defer: defer,
            reject: reject,
            when: when,
            resolve: when,
            all: all
        });
    }];
}


function $$QProvider() {
    this.$get = function () {

    };
}
