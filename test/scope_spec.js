/* jshint globalstrict: true */
/* global Scope: false */
'use strict';


describe('Scope', function () {


    it('can be constructed and used as an object', function () {
        var scope = new Scope();
        scope.aProp = 1;
        expect(scope.aProp).toBe(1)
    });


    describe('digest', function () {
        var scope;


        beforeEach(function () {
            scope = new Scope();
        });



        it('calls the listener function of a watch on first $digest', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () {
                return "a";
            };

            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });



        it('calls the listener fun when watched value changes', function () {
            scope.someValue = "a";
            scope.counter = 0;


            scope.$watch(function (scope) {
                return scope.someValue;
            }, function (newValue, oldValue, scop) {
                scop.counter++;
            })

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = "b";
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });



        it('calls listener with new value as old value the first time', function () {
            // 即使属性第一赋值，也能检查到有change
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(function (scope) {
                return scope.someValue
            }, function (newValue, oldValue, scope) {
                oldValueGiven = newValue;
            })

            scope.$digest();

            expect(oldValueGiven).toBe(123);


        });


        it('may have watchers that omit the listener function', function () {
            var watchFn = jasmine.createSpy().and.returnValue("something")
            scope.$watch(watchFn)

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();

        });


        it('triggers chained watchers in the same digest', function () {
            scope.name = "Jane";

            scope.$watch(function (scope) {
                return scope.nameUpper;
            }, function (newValue, oldValue, scope) {
                newValue && (scope.initial = newValue.substring(0, 1) + ".");
            })

            scope.$watch(function (scope) {
                return scope.name
            }, function (newValue, oldValue, scope) {
                newValue && (scope.nameUpper = newValue.toUpperCase());
            })

            scope.$digest();
            expect(scope.initial).toBe("J.");

            scope.name = "Bob";
            scope.$digest()
            expect(scope.initial).toBe("B.");

        });


        it('gives up on the watches after 10 iterations', function () {
            scope.valueA = 1;
            scope.valueB = 2;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.valueB = scope.valueA + 1;
            })

            scope.$watch(function (scope) {
                return scope.valueB;
            }, function (newValue, oldValue, scope) {
                scope.valueA = scope.valueB + 1;
            })

            expect(function () {
                scope.$digest();
            }).toThrow();


        });



        it('ends the digest when the last watch is clean', function () {
            scope.array = _.range(100);
            var watchExecutions = 0;
            _.times(100, function (i) {
                scope.$watch(function (scope) {
                    watchExecutions++;
                    return scope.array[i]
                }, function (newValue, oldValue, scope) {

                })
            })

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);

        });


        it('does not end digest so that new watches are not run', function () {
            scope.valueA = "abc";
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.$watch(function (scope) {
                    return scope.valueA;
                }, function (newValue, oldValue, scope) {
                    scope.counter++;
                })
            })

            scope.$digest();
            expect(scope.counter).toBe(1);


        });



        it('compares based on value if enabled', function () {
            scope.valueA = [1, 3, 4];
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            }, true)

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.valueA.push(6);
            scope.$digest();
            expect(scope.counter).toBe(2);

        });



        it('correctly handles NaNs', function () {
            scope.numA = 0 / 0;
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.numA;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            })

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });


        it('execute $evaled function and returns result', function () {
            scope.valueA = 10;

            var result = scope.$eval(function (scope) {
                return scope.valueA
            });

            expect(result).toBe(10);

            result = scope.$eval(function (scope, args) {
                return scope.valueA + args
            }, 1)
            expect(result).toBe(11);

        });


        it('execute $applyed function and starts digest', function () {
            scope.valueA = "a";
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.valueA
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            })

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function (scope) {
                scope.valueA = "bb";
            })

            expect(scope.counter).toBe(2);

        });


        it('execute $evalAsync function later in the same cycle', function () {
            scope.valueA = "aa";
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.$evalAsync(function (scope) {
                    scope.asyncEvaluated = true;
                });
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
            });

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);


        });


        it('executes $evalAsync function added by watch functions', function () {
            scope.valueA = [1, 2, 4];
            scope.asyncEvaluated = false;

            scope.$watch(function (scope) {
                if (!scope.asyncEvaluated) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    })
                }
                return scope.valueA;
            }, function (newValue, oldValue, scope) {

            })

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);

        });



        it('executes $evalAsync functions even when not dirty', function () {
            scope.valueA = "test";
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(function (scope) {
                if (scope.asyncEvaluatedTimes < 2) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluatedTimes++;
                    })
                }
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                // do nothing
            })

            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);

        });


        it('eventually halts $evalAsync added by watches', function () {
            scope.valueA = [1, 2, 3];

            scope.$watch(function (scope) {
                scope.$evalAsync(function (scope) {})
                return scope.valueA
            }, function (newValue, oldValue, scope) {})

            expect(function () {
                scope.$digest()
            }).toThrow();

        });



        it('has a $$phase feild whoes value is the current digest phase', function () {
            scope.valueA = "a";
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunctionn = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(function (scope) {
                scope.phaseInWatchFunction = scope.$$phase;
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.phaseInListenerFunctionn = scope.$$phase;
            })

            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            })

            expect(scope.phaseInApplyFunction).toBe("$apply");
            expect(scope.phaseInWatchFunction).toBe("$digest");
            expect(scope.phaseInListenerFunctionn).toBe("$digest");

        });


        it('allows async $apply with $appleAsync', function (done) {
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.valueA
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            })

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function (scope) {
                scope.valueA = "22";
            })

            expect(scope.counter).toBe(1);

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done()
            }, 50)


        });



        it('never executes $appleAsync function in the same cycle ', function (done) {
            scope.valueA = "111";
            scope.asyncApplied = false;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.$applyAsync(function (scope) {
                    scope.asyncApplied = true;
                })
            })

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);

            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done()
            }, 50)

        });


        it('cancels and flushes $aaplyAsync if digest first', function (done) {
            scope.counter = 0;
            scope.$watch(function (scope) {
                scope.counter++;
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                //nothing
            })
            scope.$applyAsync(function (scope) {
                scope.valueA = '1';
            });
            scope.$applyAsync(function (scope) {
                scope.valueA = '2';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.valueA).toBe('2');

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done()
            }, 50)

        });


        it('runs a  $$postDigest function after each digest', function () {
            scope.counter = 0;
            scope.$$postDigest(function () {
                scope.counter++;
            });
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);

        });


        it('do not include $$postDigest in the digest', function () {
            scope.valueA = "1";
            scope.$$postDigest(function () {
                scope.valueA = "2";
            });

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.watchedValue = newValue;
            });

            scope.$digest();
            expect(scope.watchedValue).toBe("1");
            scope.$digest();
            expect(scope.watchedValue).toBe("2");


        });


        it('catches expections in watch fucntions and continues', function () {
            scope.valueA = "1";
            scope.counter = 0;

            scope.$watch(function (scope) {
                throw "error";
            }, function (newValue, oldValue, scope) {

            });

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.counter++;

            });

            scope.$digest();

            expect(scope.counter).toBe(1);

        });

        it('catches  exceptions in listener functions and continues', function () {
            scope.valueA = "1";
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                throw "error";
            });

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });


            scope.$digest();
            expect(scope.counter).toBe(1);


        });

        it('catches exceptions in $evalAsync', function (done) {
            scope.valueA = "1";
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.valueA;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$evalAsync(function (scope) {
                throw "error";
            })

            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50)
        });

        it('catches exceptions in $applyAsync', function (done) {
            scope.$applyAsync(function (scope) {
                throw "error";
            });

            scope.$applyAsync(function (scope) {
                throw "error";
            });

            scope.$applyAsync(function (scope) {
                scope.valueA = "11";
            })

            setTimeout(function () {
                expect(scope.valueA).toBe("11");
                done();

            })
        });

        it('catches exceptions in $$postDigest', function () {
            var didRun = false;
            scope.$$postDigest(function () {
                throw "error";
            });

            scope.$$postDigest(function () {
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);
        });

        it("allows destroying a $watch with a removal function", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it("allows destroying a $watch during digest", function () {
            scope.aValue = 'abc';
            var watchCalls = [];
            scope.$watch(
                function (scope) {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );
            var destroyWatch = scope.$watch(
                function (scope) {
                    watchCalls.push('second');
                    destroyWatch();
                }
            );
            scope.$watch(
                function (scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );
            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });

        it("allows a $watch to destroy another during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    destroyWatch();
                });
            var destroyWatch = scope.$watch(
                function (scope) {},
                function (newValue, oldValue, scope) {}
            );
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("allows destroying several $watches during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch1 = scope.$watch(
                function (scope) {
                    destroyWatch1();
                    destroyWatch3();
                }
            );
            var destroyWatch2 = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    // scope.counter++;
                }
            );
            var destroyWatch3 = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        });

    });

    describe('$watchGroup', function () {
        var scope;
        beforeEach(function () {
            scope = new Scope();
        });
        it('takes watches as an array and calls listener with arrays', function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });
        it('only calls listener once per digest', function () {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });
            scope.$digest();
            expect(counter).toEqual(1);
        });

        it('uses the same array of old and new values on first run', function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it('uses different arrays for old and new values on subsequent runs', function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('calls the listener once when the watch array is empty', function () {
            var gotNewValues, gotOldValues;
            scope.$watchGroup([], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it('can be deregistered', function () {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;
            var destroyGroup = scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });
            scope.$digest();
            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();
            expect(counter).toEqual(1);
        });

        it('does not call the zero-watch listener when deregistered first', function () {
            var counter = 0;
            var destroyGroup = scope.$watchGroup([], function (newValues, oldValues, scope) {
                counter++;
            });
            destroyGroup();
            scope.$digest();
            expect(counter).toEqual(0);
        });
    });

    describe("inheritance", function () {
        it("inherits the parent's properties", function () {
            var parent = new Scope();
            parent.aValue = [1, 2, 3];
            var child = parent.$new();
            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("does not cause a parent to inherit its properties", function () {
            var parent = new Scope();
            var child = parent.$new();
            child.aValue = [1, 2, 3];
            expect(parent.aValue).toBeUndefined();
        });
        it("inherits the parent's properties whenever they are defined", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("can manipulate a parent scope's property", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.aValue.push(4);
            expect(child.aValue).toEqual([1, 2, 3, 4]);
            expect(parent.aValue).toEqual([1, 2, 3, 4]);
        });
        it("can watch a property in the parent", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            child.$digest();
            expect(child.counter).toBe(1);
            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });
        it("can be nested at any depth", function () {
            var a = new Scope();
            var aa = a.$new();
            var aaa = aa.$new();
            var aab = aa.$new();
            var ab = a.$new();
            var abb = ab.$new();
            a.value = 1;
            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);
            ab.anotherValue = 2;
            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
        });
        it("shadows a parent's property with the same name", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.name = 'Joe';
            child.name = 'Jill';
            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });
        it("shadows a parent's property with the same name", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.name = 'Joe';
            child.name = 'Jill';
            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });
        it("does not digest its parent(s)", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = 'abc';
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });
        it("keeps a record of its children", function () {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();
            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });
        it("digests its children", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });
        it("digests from root on $apply", function () {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();
            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            child2.$apply(function (scope) {});
            expect(parent.counter).toBe(1);
        });
    });
});