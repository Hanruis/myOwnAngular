/* jshint globalstrict: true */
/* global filter: false */
/* global register: false */
/* global parse: false */
"use strict";


describe('filter filter', function () {

    it('is avaiable', function () {
        expect(filter('filter')).toBeDefined();
    });



    it('can filter an array width a predicate function', function () {
        var fn = parse('[1,2,3,4] | filter:isOdd');

        var scope = {
            isOdd: function (value) {
                return value % 2 !== 0;
            }
        }

        expect(fn(scope)).toEqual([1, 3]);

    })


    it('can filter an array of string width a string', function () {
        var fn = parse('arr | filter:"a"');

        expect(fn({
            arr: ["a", "b", "a", "a"]
        })).toEqual(["a", "a", "a"]);

    });



    it('filters an array of strings width substring matching', function () {
        var fn = parse('arr | filter:"o"');
        expect(fn({
            arr: ['quick', 'brown', 'fox']
        })).toEqual(['brown', 'fox']);

    });



    it('filters an array of string ignoring case', function () {
        var fn = parse('arr | filter:"o"');
        expect(fn({
            arr: ['quick', 'BROWN', 'FOX']
        })).toEqual(['BROWN', 'FOX']);
    });

    it('filters an array of objects where any value matches', function () {
        var fn = parse('arr | filter:"o"');
        expect(fn({
            arr: [
                { firstName: 'John', lastName: 'Brown' },
                { firstName: 'Jane', lastName: 'Fox' },
                { firstName: 'Mary', lastName: 'Quick' }
            ]
        })).toEqual([
            { firstName: 'John', lastName: 'Brown' },
            { firstName: 'Jane', lastName: 'Fox' }
        ]);
    });

    it('filters an array of objects where a nested value matches', function () {
        var fn = parse('arr | filter:"o"');
        expect(fn({
            arr: [
                { name: { first: 'John', last: 'Brown' } },
                { name: { first: 'Jane', last: 'Fox' } },
                { name: { first: 'Mary', last: 'Quick' } }
            ]
        })).toEqual([
            { name: { first: 'John', last: 'Brown' } },
            { name: { first: 'Jane', last: 'Fox' } }
        ]);
    });

    it('filters an array of arrays where a nested value matches', function () {
        var fn = parse('arr | filter:"o"');
        expect(fn({
            arr: [
                [{ name: 'John' }, { name: 'Mary' }],
                [{ name: 'Jane' }]
            ]
        })).toEqual([
            [{ name: 'John' }, { name: 'Mary' }]
        ]);
    });


    it('filters with a number', function () {
        var fn = parse('arr | filter:42');
        expect(fn({
            arr: [
                { name: 'Mary', age: 42 },
                { name: 'John', age: 43 },
                { name: 'Jane', age: 44 }
            ]
        })).toEqual([
            { name: 'Mary', age: 42 }
        ]);
    });

    it('filters with a boolean value', function () {
        var fn = parse('arr | filter:true');
        expect(fn({
            arr: [
                { name: 'Mary', admin: true },
                { name: 'John', admin: true },
                { name: 'Jane', admin: false }
            ]
        })).toEqual([
            { name: 'Mary', admin: true },
            { name: 'John', admin: true }
        ]);
    });

    it('filters with a substring numeric value', function () {
        var fn = parse('arr | filter:42');
        expect(fn({ arr: ['contains 42'] })).toEqual(['contains 42']);
    });

    it('filters matching null', function () {
        var fn = parse('arr | filter:null');
        expect(fn({ arr: [null, 'not null'] })).toEqual([null]);
    });

    it('does not match null value with the string null', function () {
        var fn = parse('arr | filter:"null"');
        expect(fn({ arr: [null, 'not null'] })).toEqual(['not null']);
    });

    it('does not match undefined values', function () {
        var fn = parse('arr | filter:"undefined"');
        expect(fn({ arr: [undefined, 'undefined'] })).toEqual(['undefined']);
    });

    it('allows negating string filter', function () {
        var fn = parse('arr | filter:"!o"');
        expect(fn({ arr: ['quick', 'brown', 'fox'] })).toEqual(['quick']);
    });

    it('filters with an object', function () {
        var fn = parse('arr | filter:{name: "o"}');
        expect(fn({
            arr: [
                { name: 'Joe', role: 'admin' },
                { name: 'Jane', role: 'moderator' }
            ]
        })).toEqual([
            { name: 'Joe', role: 'admin' }
        ]);
    });

    it('must match all criteria in an object', function () {
        var fn = parse('arr | filter:{name: "o", role: "m"}');
        expect(fn({
            arr: [
                { name: 'Joe', role: 'admin' },
                { name: 'Jane', role: 'moderator' }
            ]
        })).toEqual([
            { name: 'Joe', role: 'admin' }
        ]);
    });

    it('matches everything when filtered with an empty object', function () {
        var fn = parse('arr | filter:{}');
        expect(fn({
            arr: [
                { name: 'Joe', role: 'admin' },
                { name: 'Jane', role: 'moderator' }
            ]
        })).toEqual([
            { name: 'Joe', role: 'admin' },
            { name: 'Jane', role: 'moderator' }
        ]);
    });


    it('allows negation when filtering with an object', function () {
        var fn = parse('arr | filter:{name: {first: "!o"}}');
        expect(fn({
            arr: [
                { name: { first: 'Joe' }, role: 'admin' },
                { name: { first: 'Jane' }, role: 'moderator' }
            ]
        })).toEqual([
            { name: { first: 'Jane' }, role: 'moderator' }
        ]);
    });

    it('ignores undefined values in expectation object', function () {
        var fn = parse('arr | filter:{name: thisIsUndefined}');
        expect(fn({
            arr: [
                { name: 'Joe', role: 'admin' },
                { name: 'Jane', role: 'moderator' }
            ]
        })).toEqual([
            { name: 'Joe', role: 'admin' },
            { name: 'Jane', role: 'moderator' }
        ]);
    });


    it('filters with a nested object in array', function () {
        var fn = parse('arr | filter:{users: {name: {first: "o"}}}');
        expect(fn({
            arr: [
                {
                    users: [{ name: { first: 'Joe' }, role: 'admin' },
                        { name: { first: 'Jane' }, role: 'moderator' }]
                },
                { users: [{ name: { first: 'Mary' }, role: 'admin' }] }
            ]
        })).toEqual([
            {
                users: [{ name: { first: 'Joe' }, role: 'admin' },
                    { name: { first: 'Jane' }, role: 'moderator' }]
            }
        ]);
    });

    it('filters with nested objects on the same level only', function () {
        var items = [{ user: 'Bob' },
            { user: { name: 'Bob' } },
            { user: { name: { first: 'Bob', last: 'Fox' } } }];
        var fn = parse('arr | filter:{user: {name: "Bob"}}');
        expect(fn({
            arr: [
                { user: 'Bob' },
                { user: { name: 'Bob' } },
                { user: { name: { first: 'Bob', last: 'Fox' } } }
            ]
        })).toEqual([
            { user: { name: 'Bob' } }
        ]);
    });

});
