/* jshint globalstrict: true */
/* global filter: false */
/* global register: false */
/* global parse: false */
"use strict";


describe('filter', function () {

    it('can be registered and obtained', function () {
        var myFilter = function () { };
        var myFilterFactory = function () {
            return myFilter;
        }

        register('my', myFilterFactory);

        expect(filter('my')).toBe(myFilter);


    });



    
    it('allows registering multiple filters width an object', function() {
        var filterA = function(){};
        var filterB = function(){};
        
        register({
            "filterA":filterA,
            "filterB":filterB
        })
        
        expect(filter('filterA')).toBe(filterA);
        expect(filter('filterB')).toBe(filterB);
    });

    
    it('can parse filter expressions', function() {
        register('upcase',function(){
            return function(str){
                return str.toUpperCase();
            }
        })
        
        var fn = parse('aString | upcase');
        
        expect(fn({
            aString:'Hello'
        })).toEqual('HELLO');
    });
        

        
});