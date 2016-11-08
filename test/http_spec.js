/* jshint globalstrict: true */
/* global publishExternalAPI: false, createInjector: false */


describe('$http', function () {
    var $http;
    var xhr;
    beforeEach(function () {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        $http = injector.get('$http');
    });

    beforeEach(function () {
        xhr = sinon.useFakeXMLHttpRequest();
    });
    afterEach(function () {
        xhr.restore();
    });

    it('is a function', function () {
        expect($http instanceof Function).toBe(true);
    });
    it('returns a Promise', function () {
        var result = $http({});
        expect(result).toBeDefined();
        expect(result.then).toBeDefined();
    });
});
