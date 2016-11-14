/* jshint globalstrict: true*/


function $CompileProvider($provide) {
    this.$get = function ($injector) {
        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var attrs = {};
                var directives = collectDirectives(node, attrs);
                var terminal = applyDirectivesToNode(directives, node);
                if (!terminal && node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node, attrs) {
            var directives = [];
            if (node.nodeType === Node.ELEMENT_NODE) {
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(normalizedNodeName, directives, 'E');
                _.forEach(node.attributes, function (attr) {
                    var normalizedAttr = directiveNormalize(attr.name.toLowerCase());
                    normalizedAttr = normalizedAttr.replace(/^(ngAttr)/, '').replace(/^(\w)/, function (matched, $1) {
                        return $1.toLowerCase();
                    });
                    attrs[normalizedAttr] = attr.value;
                    addDirective(normalizedAttr, directives, 'A');
                });
                _.forEach(node.classList, function (klass) {
                    var normalizedClassName = directiveNormalize(klass);
                    addDirective(normalizedClassName, directives, 'C');
                });
            } else if (node.nodeType === Node.COMMENT_NODE) {
                var match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
                if (match) {
                    addDirective(directiveNormalize(match[1]), directives, 'M');
                }
            }

            return directives;
        }

        function nodeName(element) {
            return element.nodeName || element[0].nodeName;
        }

        function addDirective(normalizedNodeName, directives, mode) {
            if (_.has(hasDirectives, normalizedNodeName)) {
                var foundDirectives = $injector.get(normalizedNodeName + 'Directive');
                var applicableDirectives = _.filter(foundDirectives, function (dir) {
                    return dir.restrict.indexOf(mode) !== -1;
                });
                directives.push.apply(directives, applicableDirectives);
                directives.sort(byPriority);
            }
        }

        function applyDirectivesToNode(directives, node, attrs) {
            var $node = $(node);
            var terminalPriority = Number.MIN_SAFE_INTEGER;
            var terminal = false;
            _.forEach(directives, function (directive) {
                if (directive.priority < terminalPriority) {
                    return;
                }
                if (directive.compile) {
                    directive.compile($node, attrs);
                }
                if (directive.terminal) {
                    terminal = true;
                    terminalPriority = directive.terminal;
                }
            });
            return terminal;
        }

        function directiveNormalize(name) {
            return _.camelCase(name.replace(/(x|data)[:\-_]/i, ''));
        }

        function byPriority(a, b) {
            var diff = b.priority - a.priority;
            if (diff) {
                return diff;
            } else if (a.name !== b.name) {
                return (a.name < b.name ? -1 : 1);
            }
            return a.index - b.index;
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
                    return _.map(factories, function (factory, index) {
                        var directive = $injector.invoke(factory);
                        if (!directive.restrict) {
                            directive.restrict = 'EA';
                        }
                        directive.priority = directive.priority || 0;
                        directive.name = directive.name || name;
                        directive.index = index;
                        return directive;
                    });
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
