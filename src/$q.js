/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFullfilled) {
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push(onFullfilled);
            if (this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
        }




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
        }

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {
                processQueue(state);
            });
        }

        function processQueue(state) {
            _.forEach(state.pending, function (onFullfilled) {
                onFullfilled(state.value);
            })
            delete state.pending;
        }

        function defer() {
            return new Deferred();
        }

        return {
            defer: defer
        }
    }]
}