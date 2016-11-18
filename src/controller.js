function $ControllerProvider() {
    var controllers = {};
    var globals = false;

    this.$get = function ($injector) {
        return function (ctrl, locals, identifier) {
            if (_.isString(ctrl)) {
                if (_.has(controllers, ctrl)) {
                    ctrl = controllers[ctrl];
                } else if (globals) {
                    ctrl = window[ctrl];
                }
            }
            var instance = $injector.instantiate(ctrl, locals);
            if (identifier) {
                addToScope(locals, identifier, instance);
            }
            return instance;
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

    function addToScope(locals, identifier, ctrlInstance) {
        if (locals && _.isObject(locals.$scope)) {
            locals.$scope[identifier] = ctrlInstance;
        } else {
            throw 'Cannot export controller as ' + identifier +
                '! No $scope object provided via locals';
        }
    }
}
