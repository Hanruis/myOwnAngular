/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = []
    this.$$lastDirtyWatch = null
    this.$$asyncQueue = []
    this.$$children = []
        // 使用这个的原因，可能是为了避免，在 $apply 的时候启动 $digest 。在 $digest 的时候 $apply
    this.$$phase = null
    this.$$applyAsyncQueue = []
    this.$$applyAsyncId = null
    this.$$postDigestQueue = []
    this.$$root = this
}


function initWatchVal() {}

function noop() {}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEqual) {

    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || noop,
        valueEqual: !!valueEqual,
        // 如果 scope 的属性是 undefined 的话，怎么破？ 怎么比较新旧值？？--》答案是将一个函数赋值给 last
        last: initWatchVal
    }

    this.$$watchers.unshift(watcher);
    this.$$root.$$lastDirtyWatch = null

    var self = this
    return function () {
        var index = self.$$watchers.indexOf(watcher)
        if (index > -1) {
            self.$$watchers.splice(index, 1)
            self.$$root.$$lastDirtyWatch = null
        }
    }

};


Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
    var self = this
    var newValue
    var oldValue
    var changeCount = 0

    var internalWatchFn = function (scope) {
        newValue = watchFn(scope)

        if (_.isObject(newValue)) {
            if (_.isArrayLike(newValue)) {
                if (!_.isArray(oldValue)) {
                    changeCount++
                    oldValue = []
                    // oldValue = newValue.slice(0)
                }
                if (newValue.length !== oldValue.length) {
                    changeCount++
                    oldValue.length = newValue.length
                    // oldValue = newValue.slice(0)
                }
                _.forEach(newValue, function (ele, index) {
                    if (!self.$$areEqual(ele, oldValue[index], false)) {
                        changeCount++
                        oldValue[index]= ele
                    }
                })

            } else {

            }
        } else {
            if (!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++
            }
            oldValue = newValue
        }

        return changeCount
    }
    var internalListenerFn = function () {
        listenerFn(newValue, oldValue, self)
    }

    return this.$watch(internalWatchFn, internalListenerFn)
}


Scope.prototype.$watchGroup = function (watchFns, listener) {
    var self = this

    var newValues = new Array(watchFns.length)
    var oldValues = new Array(watchFns.length)

    var changeReactionScheduled = false
    var firstRun = true

    if (!watchFns.length) {
        var shouldCall = true
        this.$evalAsync(function () {
            if (shouldCall) {
                listener(newValues, oldValues)
            }
        })
        return function () {
            shouldCall = false
        }
    }

    var destroyFunctions = _.map(watchFns, function (watchFn, index) {
        return self.$watch(watchFn, function (oldValue, newValue) {
            oldValues[index] = oldValue
            newValues[index] = newValue
            if (!changeReactionScheduled) {
                changeReactionScheduled = true
                self.$evalAsync(watchGroupListener)
            }
        })
    })

    return function () {
        _.forEach(destroyFunctions, function (destroyFunction) {
            destroyFunction()
        })
    }

    function watchGroupListener() {
        if (firstRun) {
            listener(newValues, newValues, self)
            firstRun = false
        } else {
            listener(oldValues, newValues, self)
        }
        changeReactionScheduled = false
    }

}


/**
 * 这里使用 digest 的原理是，在 watcher 里面挂着上次的 value
 * 不过注意，后面会遇到 object 里面的引用的问题，这样即使 obj 的某个属性改变了，
 * obj 本身的引用没有改变，这样的话是不会引起 change 的;
 * 
 * 作者这里，在 $$digestOnce 的时候，选择了 _.forEachRight,  不是很懂这个用意 ，(第一章部分)
 */
Scope.prototype.$$digestOnce = function () {
    var self = this;
    var dirty;
    var continueLoop = true;
    this.$$everyScope(function (scope) {
        var newValue
        var oldValue
        _.forEachRight(scope.$$watchers, function (watcher) {
            if (watcher) {
                try {
                    // 作者是把变量放在循环的外面。
                    // 其实不太懂为什么觉得其实放在里面也没什么关系。
                    // 如果从可读性来说，其实都一样吧。但是如果从性能来说，嗯，我觉得这个会好一点；不过现在 intel 的 
                    // cpu 有那么多的寄存器，好像也不是什么问题呃 (─.─|||)
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$$areEqual(newValue, oldValue, watcher.valueEqual)) {
                        scope.$$root.$$lastDirtyWatch = watcher;
                        watcher.last = (watcher.valueEqual ? _.cloneDeep(newValue) : newValue);
                        // 这里为什么要做条件表达式，来使得给到 listener 的 oldValue 不会是 initWatchVal
                        watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);
                        dirty = true;
                    } else if (scope.$$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false
                        return false;
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        });
        return continueLoop
    })
    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    this.$$root.$$lastDirtyWatch = null;
    var self = this;
    this.$beginPhase("$digest");

    if (this.$$root.$$applyAsyncId) {
        clearTimeout(this.$$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        // 为什么要放在上面，而不是放在  this.$$digestOnce() 下面呢?
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (error) {
                console.error(error);
            }
        }

        dirty = this.$$digestOnce();


        ttl--;
        if ((dirty || this.$$asyncQueue.length) && (ttl === 0)) {
            throw "10 digest iterations reached";
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (error) {
            console.error(error);
        }

    }
};


Scope.prototype.$$areEqual = function (newValue, oldValue, valueEqual) {
    if (valueEqual) {
        return _.isEqual(newValue, oldValue);
    } else {
        return (newValue === oldValue) || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
    }
};

Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$apply = function (applyFn) {
    try {
        this.$beginPhase("$apply");
        return this.$eval(applyFn);
    } finally {
        this.$clearPhase();
        this.$$root.$digest();
    }
};

// 没有返回一个 destroy 函数么
Scope.prototype.$evalAsync = function (evalFn) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$$root.$digest();
            }
        }, 0);
    }

    this.$$asyncQueue.push({
        scope: this,
        expression: evalFn
    });
};


Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + " already in progress";
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};



Scope.prototype.$applyAsync = function (expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function () {
        self.$eval(expr);
    });

    if (self.$$root.$$applyAsyncId === null) {
        self.$$root.$$applyAsyncId = setTimeout(function () {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};


Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (error) {

        }

    }
    this.$$root.$$applyAsyncId = null;
};


Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};


Scope.prototype.$new = function (isolate, parent) {
    var child
    parent = parent || this
    if (isolate) {
        child = new Scope()
        child.$$root = parent.$$root
        child.$$asyncQueue = parent.$$asyncQueue
        child.$$postDigestQueue = parent.$$postDigestQueue
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue
    } else {
        var ChildScope = function () {}
        ChildScope.prototype = this
        child = new ChildScope()
    }
    parent.$$children.push(child)
    child.$$watchers = []
    child.$$children = []
    child.$parent = parent
    return child
}

Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn)
        })
    } else {
        return false
    }
}

Scope.prototype.$destroy = function () {
    if (this.$parent) {
        var index = this.$parent.$$children.indexOf(this)
        if (index > -1) {
            this.$parent.$$children.splice(index, 1)
        }
    }
    this.$$watchers = null
}