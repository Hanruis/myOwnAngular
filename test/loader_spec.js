/* global setupModuleLoader:false */


describe('setupModuleLoader', function () {


    beforeEach(function () {
        delete window.angular
    });

    it('exposes angular on window', function () {
        setupModuleLoader(window);
        expect(window.angular).toBeDefined();
    });


    it('creates angular just one', function () {
        setupModuleLoader(window);
        var ng = window.angular;
        setupModuleLoader(window);
        expect(window.angular).toBe(ng);
    });


    it('exposes the angular module function', function () {
        setupModuleLoader(window)
        expect(window.angular.module).toBeDefined();
    });


    it('exposes the angular module function just one', function () {
        setupModuleLoader(window);
        var md = window.angular.module;
        setupModuleLoader(window);
        expect(window.angular.module).toBeDefined(md);

    });


    describe('modules', function () {

        beforeEach(function () {
            // delete window.angular
            setupModuleLoader(window)
        });


        it('allow registering a module', function () {
            var myModule = window.angular.module('myModule', []);
            expect(myModule).toBeDefined();
            expect(myModule.name).toEqual('myModule');
        });


        it('replaces a module when registered with same name again', function () {
            var myModule = window.angular.module('myModule', []);
            var newModule = window.angular.module('myModule', []);
            expect(myModule).not.toBe(newModule);
        });


        it('attches the requires array to the registered module', function () {
            var myModule = window.angular.module('myModule', ['myRequire'])
            expect(myModule.requires).toEqual(['myRequire']);
        });


        it('allows getting a module', function () {
            var myModule = window.angular.module('myModule', []);
            var gotModule = window.angular.module('myModule');
            expect(gotModule).toBeDefined();
            expect(myModule).toBe(gotModule);
        });


        it('throws when trying to get a nonexistent module', function () {
            expect(function () {
                window.angular.module('myModule')
            }).toThrow();
        });

        
        it('does not allow a module to be called hasOwnProperty', function() {
            expect(function(){
                window.angular.module('hasOwnProperty')
            }).toThrow();
                
        });
            



    });


});
