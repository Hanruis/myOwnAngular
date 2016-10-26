function setupModuleLoader(window) {
    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object);
    // for cache module


    var createModule = function (name, requires, modules) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name';
        }
        var invokeQueue = []


        var invokeLater = function (method) {
            return function () {
                invokeQueue.push([method, arguments])
                return moduleInstance
            }
        }

        var moduleInstance = {
            name: name,
            requires: requires || [],
            _invokeQueue: invokeQueue,
            constant: invokeLater('constant'),
            provider:invokeLater('provider')
        }
        modules[name] = moduleInstance
        return moduleInstance
    }

    var getModule = function (name, modules) {
        if (!modules[name]) {
            throw new Error('module:' + name + ' is not exist');
        }
        return modules[name] || {}
    }

    ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires) {

            if (name === 'hasOwnProperty') {
                throw new Error('hasOwnProperty is not a valid module name');
            }

            if (requires) {
                return createModule(name, requires, modules);
            }
            return getModule(name, modules)
        }
    })
}