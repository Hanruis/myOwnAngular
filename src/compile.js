/* jshint globalstrict: true*/


function $CompileProvider($provide) {
    this.$get = function ($injector) {
        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var directives = collectDirectives(node);
                applyDirectivesToNode(directives, node);
                if (node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node) {
            var directives = [];
            var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
            addDirective(normalizedNodeName, directives);
            return directives;
        }

        function nodeName(element) {
            return element.nodeName || element[0].nodeName;
        }

        function addDirective(normalizedNodeName, directives) {
            if (_.has(hasDirectives, normalizedNodeName)) {
                directives.push.apply(directives, $injector.get(normalizedNodeName + 'Directive'));
            }
        }

        function applyDirectivesToNode(directives, node) {
            var $node = $(node);
            _.forEach(directives, function (directive) {
                if (directive.compile) {
                    directive.compile($node);
                }
            });
        }

        return compile;
    };
    this.$get.inject = ['$injector'];

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

    function nameConvert(name) {
        return name.replace(/(-\w)/g, function (matched, p1) {
            return p1[1].toUpperCase();
        });
    }
}
$CompileProvider.$inject = ['$provide'];
