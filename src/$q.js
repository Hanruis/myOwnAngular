/* jshint globalstrict: true */
'use strict';

function $QProvider() {
    this.$get = function () {
        
        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function (onFullfilled) {
            this.$$state.pending = onFullfilled;
        }




        function Deferred() {
            this.promise = new Promise();
        }

        Deferred.prototype.resolve = function (value) {
            this.promise.$$state.value = value;
            scheduleProcessQueue(this.promise.$$state);
        }


        function defer() {
            return new Deferred();
        }

        return {
            defer:defer
        }

    }
}