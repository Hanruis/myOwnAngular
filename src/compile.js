/* jshint globalstrict: true*/


function $CompileProvider($provide) {
    var BOOLEAN_ATTRS = {
        multiple: true,
        selected: true,
        checked: true,
        disabled: true,
        readOnly: true,
        required: true,
        open: true
    };

    var BOOLEAN_ELEMENTS = {
        INPUT: true,
        SELECT: true,
        OPTION: true,
        TEXTAREA: true,
        BUTTON: true,
        FORM: true,
        DETAILS: true
    };


    this.$get = function ($injector, $rootScope, $parse, $controller) {
        function Attrs(node) {
            this.$node = $(node);
            this.$attr = {};
            this.$observers = Object.create(null);
        }

        Attrs.prototype.$set = function (key, value, reflectToElement, attrName) {
            this[key] = value;
            if (isBooleanAttribute(this.$node[0], key)) {
                this.$node.prop(key, value);
            }

            if (!attrName) {
                if (this.$attr[key]) {
                    attrName = this.$attr[key];
                } else {
                    attrName = this.$attr[key] = _.kebabCase(key);
                }
            } else {
                this.$attr[key] = attrName;
            }

            if (reflectToElement !== false) {
                this.$node.attr(attrName, value);
            }

            if (this.$observers) {
                _.forEach(this.$observers[key], function (observer) {
                    try {
                        observer(value);
                    } catch (e) {
                        console.log(e);
                    }
                });
            }
        };

        Attrs.prototype.$observe = function (key, fn) {
            this.$observers[key] = this.$observers[key] || [];
            this.$observers[key].push(fn);
            var self = this;
            $rootScope.$evalAsync(function () {
                fn(self[key]);
            });
            return function () {
                var index = self.$observers[key].indexOf(fn);
                if (index >= 0) {
                    self.$observers[key].splice(index, 1);
                }
            };
        };

        Attrs.prototype.$addClass = function (classVal) {
            this.$node.addClass(classVal);
        };

        Attrs.prototype.$removeClass = function (classVal) {
            this.$node.removeClass(classVal);
        };

        Attrs.prototype.$updateClass = function (newClassVal, oldClassVal) {
            var newClasses = newClassVal.split(/\s+/);
            var oldClasses = oldClassVal.split(/\s+/);
            var addedClasses = _.difference(newClasses, oldClasses);
            var removedClasses = _.difference(oldClasses, newClasses);
            if (addedClasses.length) {
                this.$addClass(addedClasses.join(' '));
            }
            if (removedClasses.length) {
                this.$removeClass(removedClasses.join(' '));
            }
        };

        function compile($compileNodes) {
            var compositeLinkFn = compileNodes($compileNodes);
            return function publicLinkFn(scope) {
                $($compileNodes).data('$scope', scope);
                compositeLinkFn(scope, $compileNodes);
            };
        }

        function compileNodes($compileNodes) {
            var linkFns = [];
            _.forEach($compileNodes, function (node, index) {
                var attrs = new Attrs(node);
                var directives = collectDirectives(node, attrs);
                var nodeLinkFn;
                if (directives.length) {
                    nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
                }
                var childLinkFn;
                if ((!nodeLinkFn || !nodeLinkFn.terminal) && node.childNodes && node.childNodes.length) {
                    childLinkFn = compileNodes(node.childNodes);
                }
                if (nodeLinkFn && nodeLinkFn.scope) {
                    attrs.$node.addClass('ng-scope');
                }

                // 通过闭包形式，每个 linkFn 都能够访问到其对应的 node, attrs
                if (nodeLinkFn || childLinkFn) {
                    linkFns.push({
                        nodeLinkFn: nodeLinkFn,
                        childLinkFn: childLinkFn,
                        idx: index
                    });
                }
            });

            function compositeLinkFn(scope, linkNodes) {
                var stableNodeList = [];

                _.forEach(linkFns, function (linkFn) {
                    var index = linkFn.idx;
                    stableNodeList[index] = linkNodes[index];
                });

                _.forEach(linkFns, function (linkFn) {
                    var node = stableNodeList[linkFn.idx];
                    if (linkFn.nodeLinkFn) {
                        if (linkFn.nodeLinkFn.scope) {
                            scope = scope.$new();
                            $(node).data('$scope', scope);
                        }

                        linkFn.nodeLinkFn(
                            linkFn.childLinkFn,
                            scope,
                            node
                        );
                    } else {
                        linkFn.childLinkFn(
                            scope,
                            node.childNodes
                        );
                    }
                });
            }

            return compositeLinkFn;
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
                    var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttr);
                    if (isNgAttr) {
                        name = _.kebabCase(
                            normalizedAttr[6].toLowerCase() +
                            normalizedAttr.substring(7)
                        );
                        normalizedAttr = directiveNormalize(name.toLowerCase());
                    }
                    attrs.$attr[normalizedAttr] = name;
                    var directiveName = normalizedAttr.replace(/(Start|End)$/, '');
                    if (directiveIsMultiElement(directiveName)) {
                        if (/Start$/.test(normalizedAttr)) {
                            attrStartName = name;
                            attrEndName = name.substring(0, name.length - 5) + 'end';
                            name = name.substring(0, name.length - 6);
                        }
                    }
                    normalizedAttr = directiveNormalize(name.toLowerCase());
                    addDirective(normalizedAttr, directives, 'A', attrStartName, attrEndName);
                    if (isNgAttr || !_.has(attrs, normalizedAttr)) {
                        attrs[normalizedAttr] = attr.value.trim();
                        if (isBooleanAttribute(node, normalizedAttr)) {
                            attrs[normalizedAttr] = true;
                        }
                    }
                });

                // 第一个感觉 class directive 有点扯
                // 命名有 attr directive ，已经很好能够处理了。
                // classList 本身有规则，每个 className 间空格隔开。class directive 要在这里里面做出相应 : ; 的处理；
                var className = node.className;
                var match;
                if (_.isString(className) && !_.isEmpty(className)) {
                    while ((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
                        var normalizedClassName = directiveNormalize(match[1]);
                        if (addDirective(normalizedClassName, directives, 'C')) {
                            attrs[normalizedClassName] = match[2] ? match[2].trim() : undefined;
                        }
                        className = className.substr(match.index + match[0].length);
                    }
                }
            } else if (node.nodeType === Node.COMMENT_NODE) {
                match = /^\s*directive\:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
                if (match) {
                    var normalizedName = directiveNormalize(match[1]);
                    if (addDirective(directiveNormalize(match[1]), directives, 'M')) {
                        attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
                    }
                }
            }

            return directives;
        }

        function nodeName(element) {
            return element.nodeName || element[0].nodeName;
        }

        function addDirective(normalizedNodeName, directives, mode, attrStartName, attrEndName) {
            var match = false;
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
                    match = true;
                });
                directives.sort(byPriority);
            }
            return match;
        }

        // 利用闭包的特性做了很多事情。
        function applyDirectivesToNode(directives, node, attrs) {
            var $node = $(node);
            var terminalPriority = Number.MIN_SAFE_INTEGER;
            var terminal = false;
            var preLinkFns = [];
            var postLinkFns = [];
            var newScope;
            var newIsolateScopeDirective;
            var controllerDirectives;
            var controllers = {};

            function addLinkFns(preLinkFn, postLinkFn, attrStart, attrEnd, isolateScope, require) {
                if (preLinkFn) {
                    if (attrStart) {
                        preLinkFn = groupElementsLinkFnWrapper(preLinkFn, attrStart, attrEnd);
                    }
                    preLinkFn.isolateScope = isolateScope;
                    preLinkFn.require = require;
                    preLinkFns.push(preLinkFn);
                }
                if (postLinkFn) {
                    if (attrEnd) {
                        postLinkFn = groupElementsLinkFnWrapper(postLinkFn, attrStart, attrEnd);
                    }
                    postLinkFn.isolateScope = isolateScope;
                    postLinkFn.require = require;
                    postLinkFns.push(postLinkFn);
                }
            }

            _.forEach(directives, function (directive) {
                if (directive.$$start) {
                    $node = groupScan(node, directive.$$start, directive.$$end);
                }

                if (directive.priority < terminalPriority) {
                    return;
                }
                if (directive.scope) {
                    if (_.isObject(directive.scope)) {
                        if (newIsolateScopeDirective || newScope) {
                            throw new Error('Multiple directives asking for new/inherited scope');
                        }
                        newIsolateScopeDirective = directive;
                    } else {
                        if (newIsolateScopeDirective) {
                            throw new Error('Multiple directives asking for new/inherited scope');
                        }
                        newScope = newScope || directive;
                    }
                }
                if (directive.compile) {
                    var linkFn = directive.compile($node, attrs);
                    // 这里也是一样，为什么要这么判断呢？直接判断 _.isObject(directive.scope) 不久好了么。
                    var isolateScope = (directive === newIsolateScopeDirective);
                    var require = directive.require;
                    if (_.isFunction(linkFn)) {
                        addLinkFns(null, linkFn, directive.$$start, directive.$$end, isolateScope, require);
                    } else if (linkFn) {
                        addLinkFns(linkFn.pre, linkFn.post, directive.$$start, directive.$$end, isolateScope, require);
                    }
                }
                if (directive.terminal) {
                    terminal = true;
                    terminalPriority = directive.terminal;
                }
                if (directive.controller) {
                    controllerDirectives = controllerDirectives || {};
                    controllerDirectives[directive.name] = directive;
                }
            });

            function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
                return function (scope, element, attrs, ctrl) {
                    var group = groupScan(element[0], attrStart, attrEnd);
                    return linkFn(scope, group, attrs, ctrl);
                };
            }

            function getControllers(require) {
                var value;
                if (_.isArray(require)) {
                    value = _.map(require, getControllers);
                } else if (controllers[require]) {
                    value = controllers[require].instance;
                } else {
                    throw 'Controller ' + require + ' required by directive, cannot be found!';
                }

                return value;
            }

            function nodeLinkFn(childLinkFn, scope, linkNode) {
                var $ele = $(linkNode);

                // 这里看的我目瞪口呆。不同的 directive  isolateScope 竟然是共享的？？？
                // 看到后面，竟然是有限制的，一个 element 只有一个 scope
                var isolateScope;
                if (newIsolateScopeDirective) {
                    isolateScope = scope.$new(true);
                    $ele.addClass('ng-isolate-scope');
                    $ele.data('$isolateScope', isolateScope);
                }

                if (controllerDirectives) {
                    _.forEach(controllerDirectives, function (directive) {
                        var locals = {
                            $scope: directive === newIsolateScopeDirective ? isolateScope : scope,
                            $element: $ele,
                            $attrs: attrs
                        };
                        var ctrl = directive.controller;
                        if (ctrl === '@') {
                            ctrl = attrs[directive.name];
                        }
                        controllers[directive.name] = $controller(ctrl, locals, true, directive.controllerAs);
                    });
                }

                if (newIsolateScopeDirective) {
                    initializeDirectiveBindings(
                        scope,
                        attrs,
                        isolateScope,
                        newIsolateScopeDirective.$$bindings.isolateScope,
                        isolateScope
                    );
                }

                var scopeDirective = newIsolateScopeDirective || newScope;
                if (scopeDirective && controllers[scopeDirective.name]) {
                    initializeDirectiveBindings(
                        scope,
                        attrs,
                        controllers[scopeDirective.name].instance,
                        scopeDirective.$$bindings.bindToController,
                        isolateScope
                    );
                }

                _.forEach(controllers, function (controller) {
                    controller();
                });
                _.forEach(preLinkFns, function (linkFn) {
                    linkFn(
                        linkFn.isolateScope ? isolateScope : scope,
                        $ele,
                        attrs,
                        linkFn.require && getControllers(linkFn.require)
                    );
                });

                if (childLinkFn) {
                    childLinkFn(scope, linkNode.childNodes);
                }
                _.forEachRight(postLinkFns, function (linkFn) {
                    linkFn(
                        linkFn.isolateScope ? isolateScope : scope,
                        $ele,
                        attrs,
                        linkFn.require && getControllers(linkFn.require)
                    );
                });
            }

            nodeLinkFn.terminal = terminal;
            nodeLinkFn.scope = newScope;

            return nodeLinkFn;
        }

        function initializeDirectiveBindings(scope, attrs, destination, bindings, newScope) {
            _.forEach(bindings, function (definition, scopeName) {
                var attrName = definition.attrName;
                switch (definition.mode) {
                    case '@':
                        attrs.$observe(attrName, function (newAttrValue) {
                            destination[scopeName] = newAttrValue;
                        });
                        if (attrs[attrName]) {
                            destination[scopeName] = attrs[attrName];
                        }
                        break;
                    case '=':
                        if (definition.optional && !attrs[attrName]) {
                            break;
                        }

                        // 双向绑定开始了→_→。。。
                        // 注意这里只有一个 watch 在 scope 上。 destination 自身的属性（在这个阶段里面）
                        // 通过每次 digest 的时候，来对比 parent ， child 里面属性的变化。
                        // 这里有个问题
                        var parentGet = $parse(attrs[attrName]);
                        var lastValue = destination[scopeName] = parentGet(scope);
                        var parentValueWatch = function () {
                            var parentValue = parentGet(scope);
                            if (destination[scopeName] !== parentValue) {
                                if (parentValue !== lastValue) {
                                    destination[attrName] = parentValue;
                                } else {
                                    parentValue = destination[scopeName];
                                    parentGet.assign(scope, parentValue);
                                }
                            }
                            lastValue = parentValue;
                            return parentValue;
                        };
                        var unwatch;
                        if (definition.collection) {
                            unwatch = scope.$watchCollection(attrs[attrName], parentValueWatch);
                        } else {
                            unwatch = scope.$watch(parentValueWatch);
                        }
                        newScope.$on('$destroy', unwatch);
                        break;
                    case '&':
                        var parentExpr = $parse(attrs[attrName]);
                        if (parentExpr === _.noop && definition.optional) {
                            break;
                        }
                        destination[scopeName] = function (args) {
                            return parentExpr(scope, args);
                        };
                        break;
                    default:
                        break;
                }
            });
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

        function isBooleanAttribute(node, attrName) {
            return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
        }


        return compile;
    };
    this.$get.inject = ['$injector', '$rootScope', '$parse', '$controller'];

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
                        if (directive.link && !directive.compile) {
                            directive.compile = _.constant(directive.link);
                        }
                        directive.$$bindings = parseDirectiveBindings(directive);
                        directive.require = directive.require || (directive.controller && name);
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

    function parseIsolateBindings(scope) {
        var bindings = {};
        _.forEach(scope, function (definition, scopeName) {
            var match = definition.match(/\s*(@|&|=(\*?))(\??)\s*(\w*)\s*/);
            bindings[scopeName] = {
                mode: match[1][0],
                collection: match[2] === '*',
                optional: match[3],
                attrName: match[4] || scopeName
            };
        });
        return bindings;
    }

    function parseDirectiveBindings(directive) {
        var bindings = {};
        if (_.isObject(directive.scope)) {
            if (directive.bindToController) {
                bindings.bindToController = parseIsolateBindings(directive.scope);
            } else {
                bindings.isolateScope = parseIsolateBindings(directive.scope);
            }
        }
        if (_.isObject(directive.bindToController)) {
            bindings.bindToController =
                parseIsolateBindings(directive.bindToController);
        }
        return bindings;
    }
}
$CompileProvider.$inject = ['$provide'];
