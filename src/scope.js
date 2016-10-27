/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    // 使用这个的原因，可能是为了避免，在 $apply 的时候启动 $digest 。在 $digest 的时候 $apply
    this.$$phase = null;
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
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
    this.$$lastDirtyWatch = null

    var self = this
    return function () {
        var index = self.$$watchers.indexOf(watcher)
        if (index > -1) {
            self.$$watchers.splice(index, 1)
            self.$$lastDirtyWatch = null
        }
    }

};

Scope.prototype.$watchGroup = function (watchFns, listener) {
    var self = this

    var newValues = new Array(watchFns.length)
    var oldValues = new Array(watchFns.length)

    var changeReactionScheduled = false

    _.forEach(watchFns, function (watchFn, index) {
        self.$watch(watchFn, function (oldValue, newValue) {
            oldValues[index] = oldValue
            newValues[index] = newValue
            if (!changeReactionScheduled) {
                changeReactionScheduled = true
                self.$evalAsync(function () {
                    changeReactionScheduled = false
                    listener(oldValues, newValues, self)
                })
            }
        })
    })
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
    _.forEachRight(this.$$watchers, function (watcher) {
        if (watcher) {
            try {
                // 作者是把变量放在循环的外面。
                // 其实不太懂为什么觉得其实放在里面也没什么关系。
                // 如果从可读性来说，其实都一样吧。但是如果从性能来说，嗯，我觉得这个会好一点；不过现在 intel 的 
                // cpu 有那么多的寄存器，好像也不是什么问题呃 (─.─|||)
                var newValue = watcher.watchFn(self);
                var oldValue = watcher.last;
                if (!self.$$areEqual(newValue, oldValue, watcher.valueEqual)) {
                    self.$$lastDirtyWatch = watcher;
                    watcher.last = (watcher.valueEqual ? _.cloneDeep(newValue) : newValue);
                    // 这里为什么要做条件表达式，来使得给到 listener 的 oldValue 不会是 initWatchVal
                    watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), self);
                    dirty = true;
                } else if (self.$$lastDirtyWatch === watcher) {
                    return false;
                }
            } catch (error) {
                console.error(error);
            }
        }
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    this.$$lastDirtyWatch = null;
    var self = this;
    this.$beginPhase("$digest");

    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
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
    // applyFn(this);
    // this.$digest();
    try {
        this.$beginPhase("$apply");
        return this.$eval(applyFn);
    } finally {
        this.$clearPhase();
        this.$digest();
    }
};

Scope.prototype.$evalAsync = function (evalFn) {
    var self = this;


    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$digest();
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

    if (self.$$applyAsyncId === null) {
        self.$$applyAsyncId = setTimeout(function () {
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
    this.$$applyAsyncId = null;
};


Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};