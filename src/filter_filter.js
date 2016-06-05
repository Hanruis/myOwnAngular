/* jshint globalstrict: true */
/* global filter: false */
/* global register: false */
/* global parse: false */
"use strict";


function filterFilter() {
    return function (array, filterExpr) {

        var predicateFn;
        if (_.isFunction(filterExpr)) {
            predicateFn = filterExpr
        } else if (_.isString(filterExpr)) {
            predicateFn = createPredicateFn(filterExpr);
        } else {
            return array;
        }
        return _.filter(array, predicateFn)
    }
    
    function createPredicateFn(expr) {
        return function(ele){
            return ele === expr;
        }
    }
    
}

register('filter', filterFilter);