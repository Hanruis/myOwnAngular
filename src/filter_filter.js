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
        } else if (_.isString(filterExpr) ||
                    _.isNumber(filterExpr) ||
                    _.isBoolean(filterExpr) ||
                    _.isNull(filterExpr) ||
                    _.isObject(filterExpr)
                     ) {
            predicateFn = createPredicateFn(filterExpr);
        } else {
            return array;
        }
        return _.filter(array, predicateFn)
    }
    
    function createPredicateFn(expr) {
        function comparator(actual, expected){
            
            if( _.isUndefined(actual) ){
                return false;
            }
            
            if( _.isNull(actual) || _.isNull(expected) ){
                return actual === expected;
            }
            
            actual = ('' + actual).toLowerCase();
            expected = ('' + expected).toLowerCase();
            
            return actual.indexOf(expected) > -1;  
        }
        
        return function predicateFn(item){
            return deepCompare(item, expr, comparator, true)
        }
    }
    
    
    function deepCompare(actual, expected, comparator, matchAnyProperty){
        
        if( _.isString(expected) && _.startsWith(expected,"!") ){
            return !deepCompare(actual,expected.substring(1), comparator, matchAnyProperty);
        }
        
        if( _.isArray(actual) ){
            return _.some(actual, function(actualItem){
                return deepCompare(actualItem, expected, comparator, comparator)
            })
        }
        
        
        if( _.isObject(actual) ){
            if( _.isObject(expected) ){
                return _.every(_.toPlainObject(expected), function(expectedValue, expectedKey){
                    if( _.isUndefined(expectedValue) ){
                        return true;
                    }
                    return deepCompare(actual[expectedKey], expectedValue, comparator)
                })
            }else if( matchAnyProperty ) {
                return _.some(actual, function (value) {
                    return deepCompare(value, expected, comparator, matchAnyProperty);
                })
            }else{
                return comparator(actual, expected);
            }
            
        }else{
            return comparator(actual, expected);
        }
    }
    
}

register('filter', filterFilter);