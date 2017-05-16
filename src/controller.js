function $ControllerProvider() {
    var controllers = {};
    var globals = false;

    this.$get = function ($injector) {
        return function (ctrl, locals, later, identifier) {
            if (_.isString(ctrl)) {
                var match = ctrl.match(/^(\S+)(\s+as\s+(\w+))?/);
                ctrl = match[1];
                identifier = identifier || match[3];
                if (_.has(controllers, ctrl)) {
                    ctrl = controllers[ctrl];
                } else if (globals) {
                    ctrl = window[ctrl];
                }
            }
            var instance;
            if (later) {
                var ctrlConstructor = _.isArray(ctrl) ? _.last(ctrl) : ctrl;
                instance = Object.create(ctrlConstructor.prototype);
                if (identifier) {
                    addToScope(locals, identifier, instance);
                }
                return _.extend(function () {
                    $injector.invoke(ctrl, instance, locals);
                    return instance;
                }, {
                    instance: instance
                });
            } else {
                instance = $injector.instantiate(ctrl, locals);
                if (identifier) {
                    addToScope(locals, identifier, instance);
                }
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
