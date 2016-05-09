/* jshint globalstrict: true */
/* global parse: false */
"use strict";



describe('parse', function() {

    it('can parse an integer', function() {
        var fn = parse("42");
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);


    });



    it('can parse a floating point number', function() {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);

    });



    it('can parse a floating point number without an integer part', function() {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);

    });


    it('can parse a number in scientific notaion', function() {
        var fn = parse('42e3');
        expect(fn()).toBe(42000);
    });


    it('can parse scientific notaion with a float coefficient', function() {
        var fn = parse(".42e2");
        expect(fn()).toBe(42);

    });


    it('can parse scientific notaion with negative exponents', function() {
        var fn = parse('4200e-2');
        expect(fn()).toBe(42);

    });



    it('can parse scientific notaion with the + sign', function() {
        var fn = parse(".42e+2");
        expect(fn()).toBe(42);

    });


    it('can parse scientific notaion not carse sensitive', function() {
        var fn = parse("42E2");
        expect(fn()).toBe(4200);

    });



    it('can parse  a string in single quotes', function() {
        var fn = parse("'abc'");
        expect(fn()).toEqual('abc');

    });


    it('will not parse a string width mismatching quotes', function() {
        expect(function() {
            parse('"abc\'');
        }).toThrow();

    });




    it('can parse a string with single quotes inside', function() {
        var fn = parse("'a\\\'b'");
        expect(fn()).toEqual("a\'b");
    });



    it('can parse a string width double quotes inside', function() {
        var fn = parse('"a\\\"b"');
        expect(fn()).toEqual('a\"b');

    });


    it('will parse a string width unicode escapes', function() {
        var fn = parse('"\\u00A0"');
        expect(fn()).toEqual('\u00A0');

    });


    it('will not parse a string with invalid unicode escapes', function() {
        expect(function() {
            parse('"\\u00T0"')
        }).toThrow();
    });



    it('will parse null', function() {
        var fn = parse('null');
        expect(fn()).toBe(null);

    });



    it('will parse true', function() {
        var fn = parse('true')
        expect(fn()).toBe(true);

    });


    it('will parse false', function() {
        var fn = parse('false')
        expect(fn()).toBe(false);

    });



    it('ignores whitespace', function() {
        var fn = parse(' \n42');
        expect(fn()).toBe(42);

    });



    it('will parse an empty array', function() {
        var fn = parse("[]");
        expect(fn()).toEqual([]);
    });


    it('will parse a non-empty array', function() {
        var fn = parse('[1,"two",[3], true]');
        expect(fn()).toEqual([1, "two", [3], true]);

    });


    it('will parse an array with trailing commas', function() {
        var fn = parse('[1,2,3,]');
        expect(fn()).toEqual([1, 2, 3]);

    });


    it('will parse an empty object', function() {
        var fn = parse("{}");
        expect(fn()).toEqual({});

    });



    it('will parse a non-empty object', function() {
        var fn = parse("{'a key':1, \"another-key\":2 }");
        expect(fn()).toEqual({
            'a key': 1,
            'another-key': 2
        });

    });



    it('will parse an object width identifier keys', function() {
        var fn = parse('{a:1, b:[2,3], c:{d:4}}');
        expect(fn()).toEqual({
            a: 1,
            b: [2, 3],
            c: {
                d: 4
            }
        });

    });



    it('looks up an attribute from the scope', function() {
        var fn = parse("akey");

        expect(fn({
            "akey": 1
        })).toBe(1);
        expect(fn({})).toBeUndefined();
    });


    it('returns undefined when looking up attribute from undefined', function() {
        var fn = parse("akey");
        expect(fn()).toBeUndefined();
    });



    it('will parse this', function() {
        var fn = parse("this");
        var scope = {};
        expect(fn(scope)).toEqual(scope);
        expect(fn()).toBeUndefined();
    });

    it("looks up a 2-part identifier path from the scope", function() {
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


    it('looks up a member from an object', function() {
        var fn = parse("{akey:42}.akey");
        expect(fn()).toBe(42);
    });



    it('looks up a 4-part identifier path from the scope', function() {
        var fn = parse("akey.bkey.ckey");
        expect(fn({
            akey: {
                bkey: {
                    ckey: 10
                }
            }
        })).toBe(10);

    });

    it('uses locals instead of scope when there is a matching key', function() {
        var fn = parse('aKey');
        var scope = {
            aKey: 42
        };
        var locals = {
            aKey: 43
        };
        expect(fn(scope, locals)).toBe(43);
    });

    it('does not use locals instead of scope when no matching key', function() {
        var fn = parse('aKey');
        var scope = {
            aKey: 42
        };
        var locals = {
            otherKey: 43
        };
        expect(fn(scope, locals)).toBe(42);


    });


    it('uses locals instead of scope first part matches', function() {
        var fn = parse('akey.bkey');

        console.log(fn.toString())

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


})