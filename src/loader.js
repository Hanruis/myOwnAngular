
function setupModuleLoader(window) {
    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object);
    // for cache module
    var module = {};

    var createModule = function (name, requires) {
        return {
            name: name,
            requires: requires || []
        }
    }

    ensure(angular, 'module', function () {
        return function (name, requires) {
            if (requires) {
                module[name] = createModule(name, requires);
            }
            return module[name]
        }
    })
}