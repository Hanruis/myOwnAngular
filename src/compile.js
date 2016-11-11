/* jshint globalstrict: true*/


function $CompileProvider($provide) {
    this.$get = function () {

    };

    // 用这种黑魔法来搞的么，卧槽。。
    var hasDirectives = {};
    this.directive = function (name, directiveFactory) {
        var self = this;

        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw new Error('hasOwnProperty is not a valid directive name');
            }
            if (!_.has(hasDirectives, name)) {
                hasDirectives[name] = [];
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, $injector.invoke);
                }]);
            }
            hasDirectives[name].push(directiveFactory);
        } else if (_.isObject(name)) {
            _.forEach(name, function (factory, n) {
                self.directive(n, factory);
            });
        }
    };
}
$CompileProvider.$inject = ['$provide'];
