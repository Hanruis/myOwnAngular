
function setupModuleLoader(window){
    function ensure(obj, name, factory){
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object);
    var module = ensure(angular,'module',function(){
        return function(){
            
        }
    })
}