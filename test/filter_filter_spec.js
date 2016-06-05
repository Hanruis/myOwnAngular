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


});
