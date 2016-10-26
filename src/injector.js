/* global angular: false */

function createInjector(modulesToLoad, isStrictMode) {

    var cache = {}
    var loadedModules = {}
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
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

        var args = _.map(annotate(fn), function (token) {
            if (_.isString(token)) {
                return locals.hasOwnProperty(token) ? locals[token] : cache[token]
            }
            throw new Error('Incorrect injection token! Expected a string, got' + token)
        })

        if (_.isArray(fn)) {
            fn = _.last(fn)
        }

        return fn.apply(context, args)
    }

    function annotate(fn) {

        if (!_.isFunction(fn) && !_.isArray(fn) ) {
            throw new Error('annotate target must be a function or a array')
        }

        if (_.isArray(fn)) {
            return fn.slice(0, fn.length-1)
        }
        if (fn.$inject) {
            return fn.$inject
        }
    
        if (!fn.length) {
            return []
        }

        if (isStrictMode) {
            throw 'fn is not using explicit annotation and cannot be invoked in strict mode';
        }

        var fnString = fn.toString().replace(STRIP_COMMENTS,'')

        return _.map(FN_ARGS.exec(fnString)[1].split(','), function (arg) {
            return arg.match(FN_ARG)[2]
        })
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