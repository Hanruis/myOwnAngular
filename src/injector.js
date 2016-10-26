/* global angular: false */
// injector 如其名，就是创建好这些模块和依赖，提供依赖注解析和注入方法。
function createInjector(modulesToLoad, isStrictMode) {

    var loadedModules = {}
    var INSTANTIATING = {}
    var path = []


    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;


    var STR_PROVIDER = 'Provider'



    // create two injector;
    // they have the same method;
    // one for providers, another for instances
    // it will find the dependency on instanceCache first , if not found, find from provider and instantiate it
    var providerCache = {}
    providerCache.$provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name';
            }
            providerCache[key] = value;
            instanceCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider)
            }
            providerCache[key + STR_PROVIDER] = provider
        }
    }

    var providerInjector = providerCache.$injector = createInternalInjector(providerCache, function (name) {
        throw 'Unknown provider: ' + name + path.join(' <- ')
    });

    var instanceCache = {}
    var instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, function (name) {
        var provider = providerInjector.get(name + 'Provider')
        return instanceInjector.invoke(provider.$get, provider)
    });



    _.forEach(modulesToLoad, function loadModule(moduleName) {

        if (loadedModules[moduleName]) {
            return
        }
        loadedModules[moduleName] = true

        var module = window.angular.module(moduleName)
        var requiredModules = module.requires
        _.forEach(module.requires, loadModule)
        runInvokeQueue(module._invokeQueue);
        runInvokeQueue(module._configBlocks);
    })

    return instanceInjector


    function runInvokeQueue(queue) {
        // 这实现的这么绕，是为了后面 config 么？
        _.forEach(queue, function (invokeArgs) {
            var service = providerInjector.get(invokeArgs[0])
            var method = invokeArgs[1]
            var args = invokeArgs[2]
            service[method].apply(service, args);
        })
    }

    function createInternalInjector(cache, factoryFn) {


        return {
            has: function (key) {
                return cache.hasOwnProperty(key) ||
                    providerCache.hasOwnProperty(key + STR_PROVIDER);
            },
            get: getService,
            invoke: invoke,
            annotate: annotate,
            instantiate: instantiate
        }

        function getService(name) {
            // get instance
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' + name + ' <- ' + path.join(' <- '));
                }
                return cache[name]
            }

            path.unshift(name)
            cache[name] = INSTANTIATING
            try {
                return (cache[name] = factoryFn(name))
            } finally {
                path.shift();
                if (cache[name] === INSTANTIATING) {
                    delete cache[name]
                }
            }
        }

        function invoke(fn, context, locals) {
            locals = locals || {}

            var args = _.map(annotate(fn), function (token) {
                if (_.isString(token)) {
                    return locals.hasOwnProperty(token) ? locals[token] : getService(token)
                }
                throw new Error('Incorrect injection token! Expected a string, got' + token)
            })

            if (_.isArray(fn)) {
                fn = _.last(fn)
            }
            path = []
            return fn.apply(context, args)
        }

        function instantiate(Type, locals) {
            var UnWrappedType = _.isArray(Type) ? _.last(Type) : Type
            var instance = Object.create(UnWrappedType.prototype)
            invoke(Type, instance, locals)
            return instance
        }
    }



    function annotate(fn) {

        if (!_.isFunction(fn) && !_.isArray(fn)) {
            throw new Error('annotate target must be a function or a array')
        }

        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1)
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

        var fnString = fn.toString().replace(STRIP_COMMENTS, '')

        return _.map(FN_ARGS.exec(fnString)[1].split(','), function (arg) {
            return arg.match(FN_ARG)[2]
        })
    }
}