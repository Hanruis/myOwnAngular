/* jshint globalstrict: true */
/* global filter: false */
/* global register: false */
/* global parse: false */
"use strict";


describe('filter filter', function() {
    
    it('is avaiable', function() {
        expect(filter('filter')).toBeDefined();   
    });
       
                    

    it('can filter an array width a predicate function',function(){
        var fn = parse('[1,2,3,4] | filter:isOdd');
        
        var scope = {
            isOdd:function(value){
                return value%2 !== 0;
            }
        }
        
        expect(fn(scope)).toEqual([1,3]);
            
    })
    
    
    it('can filter an array of string width a string', function() {
        var fn = parse('arr | filter:"a"');
        
        expect(fn({
            arr:["a","b","a","a"]
        })).toEqual(["a","a","a"]);
            
        
    });
        
        
});
    