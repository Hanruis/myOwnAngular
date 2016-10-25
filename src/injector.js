/* global angular: false */

function createInjector(modulesToLoad) {

    var cache = {}

    var $provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name';
            }
            cache[key] = value
        }
    }


    function _creaeteInjector(modulesToLoad) {
        _.forEach(modulesToLoad, function (moduleName) {
            var module = window.angular.module(moduleName);
            var requiredModules = module.requires
            if (requiredModules.length) {
                _creaeteInjector(requiredModules)
            }
            
            _.forEach(module._invokeQueue, function (invokeArgs) {
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                $provide[method].apply($provide, args);
            })
        })
    }
    _creaeteInjector(modulesToLoad)

    return {
        has: function (key) {
            return cache.hasOwnProperty(key)
        },
        get:function(key){
            return cache[key]
        }
    }
}