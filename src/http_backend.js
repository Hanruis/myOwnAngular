/* jshint globalstrict: true */

function $HttpBackendProvider() {
    this.$get = function () {
        return function (method, url, post, callback, headers, timeout, withCredentials) {
            var xhr = new XMLHttpRequest();
            var timeoutId;
            xhr.open(method, url, true);
            _.forEach(headers, function (value, key) {
                xhr.setRequestHeader(key, value);
            });
            if (withCredentials) {
                xhr.withCredentials = true;
            }
            xhr.send(post || null);
            xhr.onload = function () {
                var response = ('response' in xhr) ? xhr.response : xhr.responseText;
                var statusText = xhr.statusText || '';

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                callback(
                    xhr.status,
                    response,
                    xhr.getAllResponseHeaders(), // 原来还有这个方法的
                    statusText
                );
            };
            xhr.onerror = function () {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                callback(-1, null, '');
            };


            if (timeout && timeout.then) {
                timeout.then(function () {
                    xhr.abort();
                });
            } else if (timeout > 0) {
                timeoutId = setTimeout(function () {
                    xhr.abort();
                }, timeout);
            }
        };
    };
}
