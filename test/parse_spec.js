/* jshint globalstrict: true */
/* global parse: false */
"use strict";



describe('parse', function() {
    
    it('can parse an integer', function() {
        var fn = parse("42");
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
            
            
    });
        
        
    
    it('can parse a floating point number', function() {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);
           
    });
    
    
    
    it('can parse a floating point number without an integer part', function() {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);
            
    });
    
    
    it('can parse a number in scientific notaion', function() {
        var fn = parse('42e3');
        expect(fn()).toBe(42000);
    });
    
    
    it('can parse scientific notaion with a float coefficient', function() {
        var fn = parse(".42e2");
        expect(fn()).toBe(42);
            
    });
    
    
    it('can parse scientific notaion with negative exponents', function() {
        var fn = parse('4200e-2');
        expect(fn()).toBe(42);
            
    });
        
        
    
    it('can parse scientific notaion with the + sign', function() {
        var fn = parse(".42e+2");
        expect(fn()).toBe(42);
            
    });
    
    
    it('can parse scientific notaion not carse sensitive', function() {
        var fn = parse("42E2");
        expect(fn()).toBe(4200);
            
    });
        
        
        
        
        
        
            
});
    
