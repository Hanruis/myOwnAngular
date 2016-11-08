/* jshint globalstrict: true */


function $HttpProvider() {
    this.$get = ['$httpBackend', '$q', function ($httpBackend, $q) {
        return function $http() {
            var d = $q.defer();
            return d.promise;
        };
    }];
}
