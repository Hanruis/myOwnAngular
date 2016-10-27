function setupModuleLoader(window) {
    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object)
        // for cache module
    var METHOD_CONSTANT = 'constant'


    var createModule = function (name, requires, modules, configFn) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name'
        }
        var invokeQueue = []
        var configBlocks = []

        var invokeLater = function (service, method, arrayMethod, queue) {
            return function () {
                queue = queue || invokeQueue
                queue[ arrayMethod || 'push' ]([service, method, arguments])
                return moduleInstance
            }
        }

        var moduleInstance = {
            name: name,
            requires: requires || [],
            _invokeQueue: invokeQueue,
            _configBlocks: configBlocks,
            _runBlocks: [],
            constant: invokeLater('$provide','constant', 'unshift'),
            provider: invokeLater('$provide', 'provider'),
            config: invokeLater('$injector', 'invoke', 'push', configBlocks),
            factory: invokeLater('$provide', 'factory'),
            value: invokeLater('$provide', 'value'),
            service: invokeLater('$provide', 'service'),
            decorator:invokeLater('$provide', 'decorator'),
            run: function (fn) {
                moduleInstance._runBlocks.push(fn)
                return moduleInstance
            }
        }

        if (configFn) {
            moduleInstance.config(configFn)
        }        

        modules[name] = moduleInstance
        return moduleInstance
    }

    var getModule = function (name, modules) {
        if (!modules[name]) {
            throw new Error('module:' + name + ' is not exist')
        }
        return modules[name] || {}
    }

    ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires, configFn) {

            if (name === 'hasOwnProperty') {
                throw new Error('hasOwnProperty is not a valid module name');
            }

            if (requires) {
                return createModule(name, requires, modules, configFn);
            }
            return getModule(name, modules)
        }
    })
}