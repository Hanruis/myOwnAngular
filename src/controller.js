function $ControllerProvider() {
    this.$get = function ($injector) {
        return function (ctrl, locals) {
            return $injector.instantiate(ctrl, locals);
        };
    };
    this.$get.$inject = ['$injector'];
}
