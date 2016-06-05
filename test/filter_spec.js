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
       
       
    
    it('can parse filter chain expressions', function() {
        register('upcase', function(){
            return function(value){
                return value.toUpperCase()
            }
        })
        
        register('exclamate', function(){
            return function(value){
                return value + "!"
            }
        })
        
        var fn = parse('"hello" | upcase | exclamate ' );
        
        expect(fn()).toEqual("HELLO!");
            
    });
            
            
    
    it('can pass an additional argument to fitlers', function() {
        register('repeat', function(){
            return function(str, times){
                return _.repeat(str,times);
            };
        })
        var fn = parse('"hello" | repeat:3');
        expect(fn()).toBe('hellohellohello');
            
    });
                
    
    it('can pass serval additional arguments to filters', function() {
        register('surround',function(){
            return function(s, left, right){
                return left + s + right;
            }
        })
        
        var fn = parse('"hello" | surround:"*":"!" ');
        expect(fn()).toEqual('*hello!');
            
    });
        
});