var filters= {}

function register(name, factory) {
    
    if( _.isObject(name) ){
        return _.map(name, function(value,key){
            return filters[key] = value;
        })
    }else{
        var filter = factory()
        filters[name] = filter;
        return filter
    }
    
    
}

function filter(name) {
    return filters[name];
}