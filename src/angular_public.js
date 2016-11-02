function publishExternalAPI() {
    'use strict';
    setupModuleLoader(window);

    var ngModule = angular.module('ng', []);
    ngModule.provider('$filter', $FilterProvider)
    ngModule.provider('$parse', $ParseProvider);
}