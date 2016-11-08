/* jshint globalstrict: true */


function $HttpProvider() {
    this.$get = ['$httpBackend', '$q', '$rootScope', function ($httpBackend, $q, $rootScope) {
        return function $http(config) {
            var d = $q.defer();

            function done(status, response, statusText) {
                status = Math.max(status, 0);
                d[isSuccess(status) ? 'resolve' : 'reject']({
                    status: status,
                    data: response,
                    statusText: statusText,
                    config
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

            $httpBackend(config.method, config.url, config.data, done);

            return d.promise;
        };
    }];
}
