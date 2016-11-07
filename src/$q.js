/* jshint globalstrict: true */
function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {
        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFullfilled, onRejected) {
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push([null, onFullfilled, onRejected]);
            if (this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
        };

        Promise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.prototype.finally = function (callback) {
            return this.then(() => {
                callback();
            }, () => {
                callback();
            });
        };

        function Deferred() {
            this.promise = new Promise();
        }

        Deferred.prototype.resolve = function (value) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.value = value;
            this.promise.$$state.status = 1;
            scheduleProcessQueue(this.promise.$$state);
        };

        Deferred.prototype.reject = function (reason) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.value = reason;
            this.promise.$$state.status = 2;
            scheduleProcessQueue(this.promise.$$state);
        };

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(() => {
                processQueue(state);
            });
        }

        function processQueue(state) {
            _.forEach(state.pending, (handlers) => {
                const fn = handlers[state.status];
                if (_.isFunction(fn)) {
                    fn(state.value);
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

        return {
            defer
        };
    }];
}
