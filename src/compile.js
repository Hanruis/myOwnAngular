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
                    var attrStartName;
                    var attrEndName;
                    var name = attr.name;
                    var normalizedAttr = directiveNormalize(name.toLowerCase());
                    if (/^ngAttr[A-Z]/.test(normalizedAttr)) {
                        name = _.kebabCase(
                            normalizedAttr[6].toLowerCase() +
                            normalizedAttr.substring(7)
                        );
                    }
                    var directiveName = normalizedAttr.replace(/(Start|End)$/, '');
                    if (directiveIsMultiElement(directiveName)) {
                        if (/Start$/.test(normalizedAttr)) {
                            attrStartName = name;
                            attrEndName = name.substring(0, name.length - 5) + 'end';
                            name = name.substring(0, name.length - 6);
                        }
                    }
                    attrs[normalizedAttr] = attr.value;
                    normalizedAttr = directiveNormalize(name.toLowerCase());
                    addDirective(normalizedAttr, directives, 'A', attrStartName, attrEndName);
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

        function addDirective(normalizedNodeName, directives, mode, attrStartName, attrEndName) {
            if (_.has(hasDirectives, normalizedNodeName)) {
                var foundDirectives = $injector.get(normalizedNodeName + 'Directive');
                var applicableDirectives = _.filter(foundDirectives, function (dir) {
                    return dir.restrict.indexOf(mode) !== -1;
                });
                _.forEach(applicableDirectives, function (directive) {
                    if (attrStartName) {
                        directive = _.create(directive, {
                            $$start: attrStartName,
                            $$end: attrEndName
                        });
                    }
                    directives.push(directive);
                });
                directives.sort(byPriority);
            }
        }

        function applyDirectivesToNode(directives, node, attrs) {
            var $node = $(node);
            var terminalPriority = Number.MIN_SAFE_INTEGER;
            var terminal = false;
            _.forEach(directives, function (directive) {
                if (directive.$$start) {
                    $node = groupScan(node, directive.$$start, directive.$$end);
                }

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

        function directiveIsMultiElement(directiveName) {
            if (_.has(hasDirectives, directiveName)) {
                var directives = $injector.get(directiveName + 'Directive');
                return _.some(directives, {
                    multiElement: true
                });
            }
            return false;
        }

        function groupScan(node, startAttr, endAttr) {
            var nodes = [];
            if (startAttr && node && node.hasAttribute(startAttr)) {
                var depth = 0;
                do {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute(startAttr)) {
                            depth++;
                        } else if (node.hasAttribute(endAttr)) {
                            depth--;
                        }
                    }
                    nodes.push(node);
                    node = node.nextSibling;
                } while (depth > 0);
            } else {
                nodes.push(node);
            }
            return $(nodes);
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
