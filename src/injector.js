/* global angular: false */

function createInjector(modulesToLoad) {

    var cache = {}
    var loadedModules = {}

    var $provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name';
            }
            cache[key] = value
        }
    }

    function invoke(fn, context, locals) {
        locals = locals || {}        
        var args = _.map(fn.$inject, function (token) {
            if (_.isString(token)) {
                return locals.hasOwnProperty(token) ? locals[token] : cache[token]
            }
            throw new Error('Incorrect injection token! Expected a string, got' + token)
        })
        return fn.apply(context, args)
    }

    function annotate(fn) {
        return fn.$inject
    }    

    _.forEach(modulesToLoad, function loadModule(moduleName) {

        if (loadedModules[moduleName]) {
            return
        }
        loadedModules[moduleName] = true

        var module = window.angular.module(moduleName);
        var requiredModules = module.requires
        _.forEach(module.requires, loadModule)

        _.forEach(module._invokeQueue, function (invokeArgs) {
            var method = invokeArgs[0];
            var args = invokeArgs[1];
            $provide[method].apply($provide, args);
        })
    })

    return {
        has: function (key) {
            return cache.hasOwnProperty(key)
        },
        get: function (key) {
            return cache[key]
        },
        invoke: invoke,
        annotate:annotate
    }
}