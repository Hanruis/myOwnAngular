/* jshint globalstrict: true */
/* global parse: false */
"use strict";



describe('parse', function () {

    it('can parse an integer', function () {
        var fn = parse("42");
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);


    });



    it('can parse a floating point number', function () {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);

    });



    it('can parse a floating point number without an integer part', function () {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);

    });


    it('can parse a number in scientific notaion', function () {
        var fn = parse('42e3');
        expect(fn()).toBe(42000);
    });


    it('can parse scientific notaion with a float coefficient', function () {
        var fn = parse(".42e2");
        expect(fn()).toBe(42);

    });


    it('can parse scientific notaion with negative exponents', function () {
        var fn = parse('4200e-2');
        expect(fn()).toBe(42);

    });



    it('can parse scientific notaion with the + sign', function () {
        var fn = parse(".42e+2");
        expect(fn()).toBe(42);

    });


    it('can parse scientific notaion not carse sensitive', function () {
        var fn = parse("42E2");
        expect(fn()).toBe(4200);

    });



    it('can parse  a string in single quotes', function () {
        var fn = parse("'abc'");
        expect(fn()).toEqual('abc');

    });


    it('will not parse a string width mismatching quotes', function () {
        expect(function () {
            parse('"abc\'');
        }).toThrow();

    });




    it('can parse a string with single quotes inside', function () {
        var fn = parse("'a\\\'b'");
        expect(fn()).toEqual("a\'b");
    });



    it('can parse a string width double quotes inside', function () {
        var fn = parse('"a\\\"b"');
        expect(fn()).toEqual('a\"b');

    });


    it('will parse a string width unicode escapes', function () {
        var fn = parse('"\\u00A0"');
        expect(fn()).toEqual('\u00A0');

    });


    it('will not parse a string with invalid unicode escapes', function () {
        expect(function () {
            parse('"\\u00T0"')
        }).toThrow();
    });



    it('will parse null', function () {
        var fn = parse('null');
        expect(fn()).toBe(null);

    });



    it('will parse true', function () {
        var fn = parse('true')
        expect(fn()).toBe(true);

    });


    it('will parse false', function () {
        var fn = parse('false')
        expect(fn()).toBe(false);

    });



    it('ignores whitespace', function () {
        var fn = parse(' \n42');
        expect(fn()).toBe(42);

    });



    it('will parse an empty array', function () {
        var fn = parse("[]");
        expect(fn()).toEqual([]);
    });


    it('will parse a non-empty array', function () {
        var fn = parse('[1,"two",[3], true]');
        expect(fn()).toEqual([1, "two", [3], true]);

    });


    it('will parse an array with trailing commas', function () {
        var fn = parse('[1,2,3,]');
        expect(fn()).toEqual([1, 2, 3]);

    });


    it('will parse an empty object', function () {
        var fn = parse("{}");
        expect(fn()).toEqual({});

    });



    it('will parse a non-empty object', function () {
        var fn = parse("{'a key':1, \"another-key\":2 }");
        expect(fn()).toEqual({
            'a key': 1,
            'another-key': 2
        });

    });



    it('will parse an object width identifier keys', function () {
        var fn = parse('{a:1, b:[2,3], c:{d:4}}');
        expect(fn()).toEqual({
            a: 1,
            b: [2, 3],
            c: {
                d: 4
            }
        });

    });



    it('looks up an attribute from the scope', function () {
        var fn = parse("akey");

        expect(fn({
            "akey": 1
        })).toBe(1);
        expect(fn({})).toBeUndefined();
    });


    it('returns undefined when looking up attribute from undefined', function () {
        var fn = parse("akey");
        expect(fn()).toBeUndefined();
    });



    it('will parse this', function () {
        var fn = parse("this");
        var scope = {};
        expect(fn(scope)).toEqual(scope);
        expect(fn()).toBeUndefined();
    });

    it("looks up a 2-part identifier path from the scope", function () {
        var fn = parse("akey.bkey");

        expect(fn({
            akey: {
                bkey: 1
            }
        })).toBe(1);

        expect(fn({
            akey: {}
        })).toBeUndefined();

        expect(fn({})).toBeUndefined();

    })


    it('looks up a member from an object', function () {
        var fn = parse("{akey:42}.akey");
        expect(fn()).toBe(42);
    });



    it('looks up a 4-part identifier path from the scope', function () {
        var fn = parse("akey.bkey.ckey");
        expect(fn({
            akey: {
                bkey: {
                    ckey: 10
                }
            }
        })).toBe(10);

    });

    it('uses locals instead of scope when there is a matching key', function () {
        var fn = parse('aKey');
        var scope = {
            aKey: 42
        };
        var locals = {
            aKey: 43
        };
        expect(fn(scope, locals)).toBe(43);
    });

    it('does not use locals instead of scope when no matching key', function () {
        var fn = parse('aKey');
        var scope = {
            aKey: 42
        };
        var locals = {
            otherKey: 43
        };
        expect(fn(scope, locals)).toBe(42);


    });


    it('uses locals instead of scope first part matches', function () {
        var fn = parse('akey.bkey');

        var scope = {
            akey: {
                bkey: 10
            }
        }

        var locals = {
            akey: {}
        }

        expect(fn(scope, locals)).toBeUndefined();

    });



    it('parses a simple computed property access', function () {
        var fn = parse('akey["anotherKey"]');

        expect(fn({
            akey: {
                anotherKey: 10
            }
        })).toBe(10);
    });


    it('parses a computed numeric array access', function () {
        var fn = parse("anArray[1]")
        expect(fn({
            anArray: [1, 23, 34]
        })).toBe(23);

    });



    it('parse computed access with another access as property', function () {
        var fn = parse("akey[bkey['ckey']]");

        expect(fn({
            akey: {
                dkey: 10
            },
            bkey: {
                ckey: "dkey"
            }
        })).toBe(10);

    });



    it('parse a function call', function () {
        var fn = parse("afunction()");
        expect(fn({
            afunction: function () {
                return 41
            }
        })).toBe(41);

    });


    it('parse a function call width a single number arguments', function () {
        var fn = parse("afunction(1)");

        expect(fn({
            afunction: function (num) {
                return 41 + num
            }
        })).toBe(42);
    });



    it('calls methods accessed as computed properties', function () {
        var scope = {
            anObj: {
                akey: 10,
                bfunction: function () {
                    return this.akey
                }
            }

        }
        var fn = parse("anObj['bfunction']()");

        expect(fn(scope)).toBe(10);
    });

    it('calls methods accessed as non-computed properties', function () {
        var scope = {
            anObj: {
                akey: 10,
                bfunction: function () {
                    return this.akey
                }
            }

        }
        var fn = parse("anObj.bfunction()");

        expect(fn(scope)).toBe(10);

    });



    it('binds bare fucntions to the scope', function () {
        var scope = {
            afunction: function () {
                return this
            }
        }

        var fn = parse("afunction()");

        expect(fn(scope)).toBe(scope);

    });


    it('binds bare fucntions on locals to the locals', function () {
        var scope = {};
        var locals = {
            afunction: function () {
                return this
            }
        }

        var fn = parse("afunction()");

        expect(fn(scope, locals)).toBe(locals);

    });


    it('parse a simple attribute assignment', function () {
        var fn = parse("akey = 10");
        var scope = {};
        fn(scope)

        expect(scope.akey).toBe(10);

    });



    it('can assign any primary expression', function () {
        var fn = parse("akey =  afunction()");
        var scope = {
            afunction: function () {
                return 11
            }
        };

        fn(scope)
        expect(scope.akey).toBe(11);

    });


    it('it can assign computed object property', function () {
        var fn = parse("akey[\"bkey\"] = ckey[\"dkey\"] ")
        var scope = {
            akey: {},
            ckey: {
                dkey: 100
            }
        }

        fn(scope);

        expect(scope.akey.bkey).toBe(100);

    });

    it('can assign a non-computed object property', function () {
        var fn = parse('anObject.anAttribute = 42');
        var scope = { anObject: {} };
        fn(scope);
        expect(scope.anObject.anAttribute).toBe(42);
    });
    it('can assign a nested object property', function () {
        var fn = parse('anArray[0].anAttribute = 42');
        var scope = { anArray: [{}] };
        fn(scope);
        expect(scope.anArray[0].anAttribute).toBe(42);
    });

    it('creates the objects in the assignment path that do not exist', function () {
        var fn = parse('some["nested"].property.path = 42');
        var scope = {};
        fn(scope);
        expect(scope.some.nested.property.path).toBe(42);
    });

    it('does not allow calling the function constructor', function () {
        expect(function () {
            var fn = parse('aFunction.constructor("return window;")()');
            fn({ aFunction: function () { } });
        }).toThrow();
    });
    it('does not allow accessing __proto__', function () {
        expect(function () {
            var fn = parse('obj.__proto__');
            fn({ obj: {} });
        }).toThrow();
    });
    it('does not allow calling __defineGetter__', function () {
        expect(function () {
            var fn = parse('obj.__defineGetter__("evil", fn)');
            fn({ obj: {}, fn: function () { } });
        }).toThrow();
    });
    it('does not allow calling __defineSetter__', function () {
        expect(function () {
            var fn = parse('obj.__defineSetter__("evil", fn)');
            fn({ obj: {}, fn: function () { } });
        }).toThrow();
    });
    it('does not allow calling __lookupGetter__', function () {
        expect(function () {
            var fn = parse('obj.__lookupGetter__("evil")');
            fn({ obj: {} });
        }).toThrow();
    });
    it('does not allow calling __lookupSetter__', function () {
        expect(function () {
            var fn = parse('obj.__lookupSetter__("evil")');
            fn({ obj: {} });
        }).toThrow();
    });

    it('does not allow accessing window as computed property', function () {
        var fn = parse('anObject["wnd"]');
        expect(function () { fn({ anObject: { wnd: window } }); }).toThrow();
    });
    it('does not allow accessing window as non-computed property', function () {
        var fn = parse('anObject.wnd');
        expect(function () { fn({ anObject: { wnd: window } }); }).toThrow();
    });
    it('does not allow passing window as function argument', function () {
        var fn = parse('aFunction(wnd)');
        expect(function () {
            fn({ aFunction: function () { }, wnd: window });
        }).toThrow();
    });
    it('does not allow calling methods on window', function () {
        var fn = parse('wnd.scrollTo(0)');
        expect(function () {
            fn({ wnd: window });
        }).toThrow();
    });
    it('does not allow functions to return window', function () {
        var fn = parse('getWnd()');
        expect(function () { fn({ getWnd: _.constant(window) }); }).toThrow();
    });
    it('does not allow assigning window', function () {
        var fn = parse('wnd = anObject');
        expect(function () {
            fn({ anObject: window });
        }).toThrow();
    });
    it('does not allow referencing window', function () {
        var fn = parse('wnd');
        expect(function () {
            fn({ wnd: window });
        }).toThrow();
    });
    it('does not allow calling functions on DOM elements', function () {
        var fn = parse('el.setAttribute("evil", "true")');
        expect(function () { fn({ el: document.documentElement }); }).toThrow();
    });

    it('does not allow calling the aliased function constructor', function () {
        var fn = parse('fnConstructor("return window;")');
        expect(function () {
            fn({ fnConstructor: (function () { }).constructor });
        }).toThrow();
    });
    it('does not allow calling functions on Object', function () {
        var fn = parse('obj.create({})');
        expect(function () {
            fn({ obj: Object });
        }).toThrow();
    });

    it('does not allow calling call', function () {
        var fn = parse('fun.call(obj)');
        expect(function () { fn({ fun: function () { }, obj: {} }); }).toThrow();
    });
    
    it('does not allow calling apply', function () {
        var fn = parse('fun.apply(obj)');
        expect(function () { fn({ fun: function () { }, obj: {} }); }).toThrow();
    });

})

