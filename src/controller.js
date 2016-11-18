function $ControllerProvider() {
    var controllers = {};
    var globals = false;

    this.$get = function ($injector) {
        return function (ctrl, locals) {
            if (_.isString(ctrl)) {
                if (_.has(controllers, ctrl)) {
                    ctrl = controllers[ctrl];
                } else if (globals) {
                    ctrl = window[ctrl];
                }
            }

            return $injector.instantiate(ctrl, locals);
        };
    };
    this.$get.$inject = ['$injector'];

    this.register = function (name, ctrl) {
        if (_.isObject(name)) {
            _.extend(controllers, name);
        }
        controllers[name] = ctrl;
    };

    this.allowGlobals = function () {
        globals = true;
    };
}
