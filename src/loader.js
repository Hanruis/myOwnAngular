
function setupModuleLoader(window) {
    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object);
    // for cache module

    var createModule = function (name, requires, modules) {
        var invokeQueue = [];
        modules[name] = {
            name: name,
            requires: requires || [],
            constant:function(key,value){
                invokeQueue.push(['constant', [key,value]]);
            },
            _invokeQueue:invokeQueue
        } 
        return modules[name] 
    }

    var getModule = function(name,modules){
        if( !modules[name] ){
            throw new Error('module:'+name+' is not exist');
        }
        return modules[name] || {}
    }

    ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires) {

            if( name === 'hasOwnProperty' ){
                throw new Error('hasOwnProperty is not a valid module name');
            }

            if (requires) {
                return  createModule(name, requires, modules);
            }
            return getModule(name, modules)
        }
    })
}
