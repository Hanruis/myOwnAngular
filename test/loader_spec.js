/* global setupModuleLoader:false */


describe('setupModuleLoader', function() {
    
    
    beforeEach(function() {
        delete window.angular
    });
        
    it('exposes angular on window', function() {
        setupModuleLoader(window);
        expect(window.angular).toBeDefined();
    });
        
    
    it('creates angular just one', function() {
        setupModuleLoader(window);
        var ng = window.angular;
        setupModuleLoader(window);
        expect(window.angular).toBe(ng);
    });

    
    it('exposes the angular module function', function() {
        setupModuleLoader(window)
        expect(window.angular.module).toBeDefined();
    });

    
    it('exposes the angular module function just one', function() {
        setupModuleLoader(window);
        var md = window.angular.module;
        setupModuleLoader(window);
        expect(window.angular.module).toBeDefined(md);
                    
    });
        
        
            
});
    