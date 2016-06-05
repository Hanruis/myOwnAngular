/* jshint globalstrict: true */
/* global filter: false */
/* global register: false */
/* global parse: false */
"use strict";


function filterFilter(){
    return function(array, filterExpr){
        return _.filter(array, filterExpr)
    }
}

register('filter', filterFilter);