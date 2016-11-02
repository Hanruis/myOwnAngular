function $FilterProvider($provide) {
    var filters = {}
    this.register = function (name, factory) {
        var self = this;
        if (_.isObject(name)) {
            return _.map(name, function (factory, name) {
                return self.register(name, factory);
            });
        } else {
            return $provide.factory(name + 'Filter', factory)
        }
    }

    this.$get = ['$injector', function ($injector) {
        return function filter(name) {
            return $injector.get(name + 'Filter');
        }
    }]

    this.register('filter', filterFilter);
}
$FilterProvider.$inject = ['$provide'];