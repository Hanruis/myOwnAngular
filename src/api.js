/* jshint globalstrict: true */
'use strict';

function hashKey(value) {
    var type = typeof value
    var uid

    if (_.isFunction(value) || (_.isObject(value) && !_.isNull(value)) ) {
        uid = value.$$hashKey
        if (_.isUndefined(uid)) {
            uid = value.$$hashKey = _.uniqueId()
        } else if (_.isFunction(uid)) {
            uid = value.$$hashKey()
        }
    } else {
        uid = value
    }
    return type + ':' + uid
}


function HashMap() {
    this.map = {};
}
HashMap.prototype.put = function (key, value) {
    this.map[hashKey(key)] = value
}
HashMap.prototype.get = function (key) {
    return this.map[hashKey(key)]
}

HashMap.prototype.remove = function (key) {
    var value = this.get(key)
    if (this.has(key)) {
        delete this.map[hashKey(key)]
    }
    return value
}

HashMap.prototype.has = function (key) {
    return this.map.hasOwnProperty(hashKey(key))
}