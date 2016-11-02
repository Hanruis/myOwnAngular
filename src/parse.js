// 其实不习惯这种面向对象的写法;
/* global filter: false */


var ESCAPES = {
    'n': '\n',
    'f': '\f',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\'': '\'',
    '\"': '"'
}

var OPERATROS = {
    "+": true,
    "!": true,
    "-": true,
    "*": true,
    "/": true,
    "%": true,
    "=": true,
    "==": true,
    "!=": true,
    "===": true,
    "!==": true,
    ">": true,
    ">=": true,
    "<": true,
    "<=": true,
    "||": true,
    "&&": true,
    "|": true,
}


function parse(expr) {
    switch (typeof expr) {
        case 'string':
            var lexer = new Lexer();
            var parser = new Parser(lexer);
            var parseFn = parser.parse(expr);
            var oneTime = false;
            if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
                oneTime = true;
                expr = expr.substring(2);
            }
            if (parseFn.constant) {
                parseFn.$$watchDelegate = constantWatchDelegate;
            } else if (oneTime) {
                parseFn.$$watchDelegate = oneTimeWatchDelegate;
            }
            return parseFn;
        case 'function':
            return expr;
        default:
            return _.noop;
    }
}


function Lexer() {

}

Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index)
        if (
            this.isNumber(this.ch) ||
            (this.is(".") && this.isNumber(this.peek()))
        ) {
            this.readNumber();
        } else if (this.isQuote(this.ch)) {
            this.readString(this.ch);
        } else if (this.is("[],{}:.()?;")) {
            this.tokens.push({
                text: this.ch
            });
            this.index++;
        } else if (this.isIdent(this.ch)) {
            this.readIdent()
        } else if (this.isWhitespace(this.ch)) {
            this.index++;
        } else {

            var ch = this.ch;
            var ch2 = this.ch + this.peek();
            var ch3 = this.ch + this.peek() + this.peek(2);

            var op = OPERATROS[ch];
            var op2 = OPERATROS[ch2];
            var op3 = OPERATROS[ch3];

            if (op || op2 || op3) {
                var token = op3 ? ch3 : (op2 ? ch2 : ch)
                this.tokens.push({
                    text: token
                })
                this.index += token.length;
            } else {
                throw "Unexpected next character: " + this.ch;
            }
        }
    }

    return this.tokens;
};



Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
}

Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index).toLowerCase();
        if (ch === '.' || this.isNumber(ch)) {
            number += ch;
        } else {
            var nextCh = this.peek();
            var prevCh = number.charAt(number.length - 1);
            if (ch === "e" && this.isExpOperator(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' && (!nextCh || !this.isNumber(nextCh))) {
                throw "error";
            } else {
                break;
            }
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: Number(number)
    })
}

Lexer.prototype.isExpOperator = function (ch) {
    return ch === '-' || ch === '+' || this.isNumber(ch);
}

Lexer.prototype.readString = function (startQuote) {
    this.index++;
    var string = '';
    var rawString = startQuote
    var escape = false;
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        rawString += ch;
        if (escape) {

            if (ch === "u") {
                var hex = this.text.substring(this.index + 1, this.index + 5);
                if (!hex.match(/[\da-f]{4}/i)) {
                    throw 'Invalid unicode escape';
                }
                this.index += 4;
                string += String.fromCharCode(parseInt(hex, 16));
            } else {
                var replacement = ESCAPES[ch];
                if (replacement) {
                    string += replacement;
                } else {
                    string += ch;
                }
            }

            escape = false;
        } else if (ch === startQuote) {
            this.index++;
            this.tokens.push({
                text: rawString,
                value: string
            })
            return;
        } else if (ch === '\\') {
            escape = true;
        } else {
            string += ch;
        }

        this.index++;
    }

    throw "string : unmatched quote";
}


Lexer.prototype.isQuote = function (ch) {
    return ch === '\'' || ch === '"'
}


// 获取下一个字符
Lexer.prototype.peek = function (n) {
    n = n || 1;
    return this.index + n < this.text.length ? this.text.charAt(this.index + n) : false;
}


Lexer.prototype.isIdent = function (ch) {
    return /[a-zA-Z_\$]/.test(ch);
}


Lexer.prototype.readIdent = function () {
    var text = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index);
        if (this.isIdent(ch) || this.isNumber(ch)) {
            text += ch;
        } else {
            break;
        }
        this.index++;
    }
    var token = {
        text: text,
        identifier: true
    };

    this.tokens.push(token)
}


Lexer.prototype.isWhitespace = function (ch) {
    return /(\s|\r|\t|\n|\v|\u00A0)/.test(ch)
}

// 不明白作者这里为什么要用 indexOf 而不是用 === 
Lexer.prototype.is = function (chs) {
    return chs.indexOf(this.ch) >= 0;
}





function AST(lexer) {
    this.lexer = lexer;
}

AST.Program = "Program"
AST.Literal = "Literal"
AST.ArrayExpression = "ArrayExpression"
AST.ObjectExpression = "ObjectExpression"
AST.Property = "Property";
AST.Identifier = "Identifier";
AST.ThisExpression = "ThisExpression";
AST.MemberExpression = "MemberExpression";
AST.CallExpression = "CallExpression";
AST.AssignmentExpression = "AssignmentExpression";
AST.UnaryExpression = "UnaryExpression";
AST.BinaryExpression = "BinaryExpression";
AST.LogicalExpression = "LogicalExpression";
AST.ConditionalExpression = "ConditionalExpression";

AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};

AST.prototype.program = function () {

    var body = [];

    while (true) {
        if (this.tokens.length) {
            body.push(this.filter())
        }
        if (!this.expect(";")) {
            return {
                type: AST.Program,
                body: body
            }
        }
    }

}

AST.prototype.assignment = function () {

    var left = this.ternary();
    if (this.expect("=")) {
        return {
            type: AST.AssignmentExpression,
            left: left,
            right: this.ternary()
        }
    }
    return left;

}


AST.prototype.primary = function () {
    var primary;
    if (this.expect('(')) {
        primary = this.filter();
        this.consume(")")
    } else if (this.expect('[')) {
        primary = this.arrayDeclaration();
    } else if (this.expect("{")) {
        primary = this.object();
    } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
        primary = this.constants[this.consume().text]
    } else if (this.peek().identifier) {
        primary = this.identifier()
    } else {
        primary = this.constant();
    }

    var next;
    while ((next = this.expect(".", "[", "("))) {

        if (next.text === '.') {
            primary = {
                type: AST.MemberExpression,
                object: primary,
                property: this.identifier(),
                computed: false
            }
        } else if (next.text === '[') {
            primary = {
                type: AST.MemberExpression,
                object: primary,
                property: this.primary(),
                computed: true
            }
            this.consume("]");
        } else if (next.text === "(") {
            primary = {
                type: AST.CallExpression,
                callee: primary,
                arguments: this.parseArguments() // 2016.5.12 晚，写到这里，parse 函数参数
            }
            this.consume(")");
        }
    }


    return primary;
}

AST.prototype.constant = function () {
    return {
        type: AST.Literal,
        value: this.consume().value
    }
}


AST.prototype.constants = {
    'null': {
        type: AST.Literal,
        value: null
    },
    'true': {
        type: AST.Literal,
        value: true
    },
    'false': {
        type: AST.Literal,
        value: false
    },
    'this': {
        type: AST.ThisExpression
    }
}

AST.prototype.expect = function (e1, e2, e3, e4) {

    var token = this.peek(e1, e2, e3, e4);

    if (token) {
        return this.tokens.shift();
    }

}

AST.prototype.consume = function (e) {
    var token = this.expect(e);
    if (!token) {
        throw "Unexpected.  Expecting: " + e;
    }
    return token;
}

AST.prototype.arrayDeclaration = function () {

    var elements = [];

    if (!this.peek(']')) {
        do {
            if (this.peek(']')) {
                break;
            }
            elements.push(this.assignment());
        } while (this.expect(','));
    }

    this.consume(']');
    return {
        type: AST.ArrayExpression,
        elements: elements
    }
}

AST.prototype.peek = function (e1, e2, e3, e4) {
    if (this.tokens.length > 0) {
        var text = this.tokens[0].text;
        if (text === e1 || text === e2 || text === e3 || text === e4 ||
            (!e1 && !e2 && !e3 && !e4)
        ) {
            return this.tokens[0];
        }
    }
}

AST.prototype.object = function () {

    var properties = [];

    if (!this.peek("}")) {

        do {
            var prop = {
                type: AST.Property
            };

            if (this.peek().identifier) {
                prop.key = this.identifier();
            } else {
                prop.key = this.constant();
            }

            this.consume(":")
            prop.value = this.assignment();
            properties.push(prop)
        } while (this.expect(","))


    }

    this.consume("}");
    return {
        type: AST.ObjectExpression,
        properties: properties
    }
}

AST.prototype.identifier = function () {
    return {
        type: AST.Identifier,
        name: this.consume().text
    }
}


AST.prototype.parseArguments = function () {

    var argumentsList = [];

    if (!this.peek(")")) {
        do {
            argumentsList.push(this.assignment());
        } while (this.expect(","))
    }
    return argumentsList

}

AST.prototype.unary = function () {
    var token;
    if (token = this.expect("+", "!", "-")) {
        return {
            type: AST.UnaryExpression,
            operator: token.text,
            argument: this.unary()
        }
    } else {
        return this.primary();
    }
}
AST.prototype.multiplicative = function () {
    var left = this.unary();
    var token;
    while (token = this.expect("*", "/", "%")) {
        left = {
            type: AST.BinaryExpression,
            left: left,
            operator: token.text,
            right: this.unary()
        }
    }

    return left;
}

AST.prototype.additive = function () {
    var left = this.multiplicative();
    var token;
    while (token = this.expect("+", "-")) {
        left = {
            type: AST.BinaryExpression,
            left: left,
            right: this.multiplicative(),
            operator: token.text
        }
    }
    return left;
}

AST.prototype.equality = function () {
    var left = this.relational();
    var token;
    while (token = this.expect("==", "===", "!=", "!==")) {
        left = {
            left: left,
            right: this.relational(),
            type: AST.BinaryExpression,
            operator: token.text
        }
    }
    return left;
}

AST.prototype.relational = function () {
    var left = this.additive();
    var token;
    while (token = this.expect(">", ">=", "<", "<=")) {
        left = {
            left: left,
            right: this.additive(),
            type: AST.BinaryExpression,
            operator: token.text
        }
    }
    return left;
}

AST.prototype.logicalOR = function () {
    var left = this.logicalAND();
    var token;
    while (token = this.expect("||")) {
        left = {
            type: AST.LogicalExpression,
            left: left,
            right: this.logicalAND(),
            operator: token.text
        }
    }
    return left;
}
AST.prototype.logicalAND = function () {
    var left = this.equality();
    var token;

    while (token = this.expect("&&")) {
        left = {
            type: AST.LogicalExpression,
            left: left,
            right: this.equality(),
            operator: token.text
        }
    }
    return left;
}

AST.prototype.ternary = function () {
    var test = this.logicalOR();
    var token;

    if (token = this.expect("?")) {
        var consequent = this.assignment();
        if (this.consume(":")) {
            var alternate = this.assignment();
            return {
                type: AST.ConditionalExpression,
                test: test,
                consequent: consequent,
                alternate: alternate
            }
        }

    }
    return test;
}

AST.prototype.filter = function () {
    var left = this.assignment();

    while (this.expect("|")) {
        var args = [left];
        left = {
            type: AST.CallExpression,
            callee: this.identifier(),
            arguments: args,
            filter: true
        }
        while (this.expect(":")) {
            args.push(this.assignment());
        }
    }
    return left;
}





function ASTCompiler(astBuilder, $filter) {
    this.astBuilder = astBuilder;
    this.$filter = $filter;
}

ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
    this.state = {
        body: [],
        nextId: 0,
        vars: [],
        filters: {}
    }
    this.recurse(ast);
    var fnString = this.filterPrefix() +
        'var fn=function(s,l){' +
        (this.state.vars.length ? "var " + this.state.vars.join(",") + ";" : "") +
        this.state.body.join(' ') +
        "}; return fn; "

    /* jshint -W054 */
    var fn = new Function(
        'ensureSafeMemberName',
        'ensureSafeObject',
        'ensureSafeFunction',
        'ifDefined',
        'filter',
        fnString)(
        ensureSafeMemberName,
        ensureSafeObject,
        ensureSafeFunction,
        ifDefined,
        this.$filter
    );
    fn.literal = isLiteral(ast);
    fn.constant = ast.constant;
    return fn;
    /* jshint +W054 */
};

ASTCompiler.prototype.recurse = function (ast, context, create) {
    var self = this;
    var intoId;
    switch (ast.type) {
        case AST.Program:
            _.forEach(_.initial(ast.body), function (statement) {
                self.state.body.push(self.recurse(statement), ';')
            })
            this.state.body.push('return', this.recurse(_.last(ast.body)), ';')
            break;
        case AST.Literal:
            return this.escape(ast.value);
        case AST.ArrayExpression:
            var elements = _.map(ast.elements, function (element) {
                return self.recurse(element);
            });
            return '[' + elements.join(',') + ']';
        case AST.ObjectExpression:
            var properties = _.map(ast.properties, function (prop) {
                var key = prop.key.type === AST.Identifier ? prop.key.name : self.escape(prop.key.value)
                var value = self.recurse(prop.value);
                return key + ":" + value
            })
            return "{" + properties.join(",") + "}";
        case AST.Identifier:
            ensureSafeMemberName(ast.name)
            intoId = this.nextId();
            this.if_(this.getHasOwnProperty("l", ast.name),
                this.assign(intoId, this.nonComputedMember("l", ast.name))
            );

            if (create) {
                this.if_(this.not(this.getHasOwnProperty("l", ast.name)) +
                    "&& s && " +
                    this.not(this.getHasOwnProperty("s", ast.name)),
                    this.assign(this.nonComputedMember("s", ast.name), "{}")
                )
            }

            this.if_(this.not(this.getHasOwnProperty("l", ast.name)) + " && s",
                this.assign(intoId, this.nonComputedMember('s', ast.name))
            )

            if (context) {
                context.context = this.getHasOwnProperty("l", ast.name) + "?l:s";
                context.name = ast.name;
                context.computed = false;
            }

            this.addEnsureSafeObject(intoId);

            return intoId;
        case AST.ThisExpression:
            return 's';
        case AST.MemberExpression:
            intoId = this.nextId();
            var left = this.recurse(ast.object, undefined, create);


            if (context) {
                context.context = left;
            }

            if (ast.computed) {
                var right = this.recurse(ast.property);
                this.addEnsureSafeMemberName(right);
                if (create) {
                    this.if_(this.not(this.computedMember(left, right)),
                        this.assign(this.computedMember(left, right), "{}")
                    )
                }

                this.if_(
                    left,
                    this.assign(intoId, 'ensureSafeObject(' + this.computedMember(left, right) + ')')
                );
                if (context) {
                    context.name = right;
                    context.computed = true;
                }

            } else {
                ensureSafeMemberName(ast.property.name)

                if (create) {
                    this.if_(this.not(this.nonComputedMember(left, ast.property.name)),
                        this.assign(this.nonComputedMember(left, ast.property.name), "{}")
                    )
                }

                this.if_(
                    left,
                    this.assign(intoId, 'ensureSafeObject(' + this.nonComputedMember(left, ast.property.name) + ')')
                );
                if (context) {
                    context.name = ast.property.name;
                    context.computed = false;
                }

            }
            return intoId;
        case AST.CallExpression:
            var callContext, callee, args;

            if (ast.filter) {
                callee = this.filter(ast.callee.name);
                args = _.map(ast.arguments, function (ele) {
                    return self.recurse(ele);
                })
                return callee + '(' + args.join(",") + ')';
            } else {
                callContext = {};
                callee = this.recurse(ast.callee, callContext);
                args = _.map(ast.arguments, function (arg) {
                    return 'ensureSafeObject(' + self.recurse(arg) + ')';
                })
                if (callContext.name) {

                    this.addEnsureSafeObject(callContext.context)

                    if (callContext.computed) {
                        callee = this.computedMember(callContext.context, callContext.name)
                    } else {
                        callee = this.nonComputedMember(callContext.context, callContext.name)
                    }
                }
                this.addEnsureSafeFunction(callee);
                return callee + " &&  ensureSafeObject(" + callee + "( " + args.join(",") + " ))";
            }
        case AST.AssignmentExpression:
            var leftContext = {}
            this.recurse(ast.left, leftContext, true);
            var leftExpr;
            if (leftContext.computed) {
                leftExpr = this.computedMember(leftContext.context, leftContext.name)
            } else {
                leftExpr = this.nonComputedMember(leftContext.context, leftContext.name)
            }

            return this.assign(leftExpr, 'ensureSafeObject(' + this.recurse(ast.right) + ')')
        case AST.UnaryExpression:
            return ast.operator + '(' + this.isDefined(this.recurse(ast.argument), 0) + ')';

        case AST.BinaryExpression:
            return '(' + this.isDefined(this.recurse(ast.left), 0) + ')' + ast.operator + this.isDefined(this.recurse(ast.right), 0);
        case AST.LogicalExpression:
            //  作者这里用了好多条件判断去做，模拟 || 和 && 的运算情况，觉得好奇怪，为什么要做的那么复杂呢？？
            return '(' + this.recurse(ast.left) + ')' + ast.operator + '(' + this.recurse(ast.right) + ')'

        case AST.ConditionalExpression:
            intoId = this.nextId();

            this.state.body.push(this.assign(intoId, this.recurse(ast.test)));

            this.if_(intoId, this.assign(intoId, this.recurse(ast.consequent)));
            this.if_(this.not(intoId), this.assign(intoId, this.recurse(ast.alternate)));

            return intoId
    }
}


ASTCompiler.prototype.escape = function (value) {
    if (_.isString(value)) {
        return '\'' + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + '\''
    } else if (_.isNull(value)) {
        return 'null'
    } else {
        return value;
    }
}

ASTCompiler.prototype.stringEscapeRegex = /[^ a-zA-z0-9]/g;

ASTCompiler.prototype.stringEscapeFn = function (c) {
    // 注意补零的操作
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
}

// 作者这里用了 left， right 来表示，感觉不是很好
ASTCompiler.prototype.nonComputedMember = function (left, right) {
    return "(" + left + ")." + right;
}

ASTCompiler.prototype.if_ = function (test, consequent) {
    this.state.body.push('if(', test, '){', consequent, '}');
};

ASTCompiler.prototype.assign = function (id, value) {
    return id + "=" + value + ";";
};

ASTCompiler.prototype.nextId = function (skip) {
    var id = 'v' + this.state.nextId++;
    if (!skip) {
        this.state.vars.push(id)
    }
    return id;
}


ASTCompiler.prototype.not = function (e) {
    return "!(" + e + ")"
}

ASTCompiler.prototype.getHasOwnProperty = function (object, property) {
    return object + " &&(" + this.escape(property) + " in " + object + ")";
}

ASTCompiler.prototype.computedMember = function (left, right) {
    return "(" + left + ")[" + right + "]"
}

ASTCompiler.prototype.addEnsureSafeMemberName = function (expr) {
    this.state.body.push('ensureSafeMemberName(' + expr + ');')
}
ASTCompiler.prototype.addEnsureSafeObject = function (expr) {
    this.state.body.push("ensureSafeObject(" + expr + ");");
}

ASTCompiler.prototype.addEnsureSafeFunction = function (expr) {
    this.state.body.push("ensureSafeFunction(" + expr + ");")
}
ASTCompiler.prototype.isDefined = function (value, defaultValue) {
    return 'ifDefined(' + value + ',' + this.escape(defaultValue) + ')';
}

ASTCompiler.prototype.filter = function (name) {
    if (!this.state.filters.hasOwnProperty(name)) {
        this.state.filters[name] = this.nextId(true);
    }
    return this.state.filters[name];
}
ASTCompiler.prototype.filterPrefix = function () {
    var self = this;
    if (_.isEmpty(this.state.filters)) {
        return ''
    } else {
        var parts = _.map(this.state.filters, function (varName, filterName) {
            return varName + '=' + 'filter(' + self.escape(filterName) + ')';
        })
        return 'var ' + parts.join(",") + ";";
    }
}



var CALL = Function.prototype.call;
var APPLY = Function.prototype.apply;
var BIND = Function.prototype.bind;


function Parser(lexer, $filter) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.ASTCompiler = new ASTCompiler(this.ast, $filter);
}


Parser.prototype.parse = function (text) {
    return this.ASTCompiler.compile(text);
}


function ensureSafeMemberName(name) {
    var unSafePropList = [
        "constructor",
        "__proto__",
        "__defineGetter__",
        "__defineSetter__",
        "__lookupGetter__",
        "__lookupSetter__",
    ]
    if (_.indexOf(unSafePropList, name) > -1) {
        throw "Attempting to access a disallowed filed in Angular expressions!"
    }
}

function ensureSafeObject(obj) {
    if (obj) {
        if (obj.document && obj.location && obj.alert && obj.setInterval) {
            throw 'Reerencing window in Angular expresss is disallowed!';
        } else if (obj.children && obj.nodeName || (obj.prop && obj.attr && obj.find)) {
            throw 'Referencing DOM nodes in Angular expressions is disallowed!';
        } else if (obj.constructor === obj) {
            throw 'Referencing Function in Angular expressions is disallowed';
        } else if (obj.getOwnPropertyNames || obj.getOwnPropertyDescriptor) {
            throw 'Referencing Object in Angular expressions is disallowed';
        }
    }
    return obj;
}

function ensureSafeFunction(obj) {
    if (obj) {
        if (obj.constructor === obj) {
            throw 'Referencing Function in Angular expressions is disallowed'
        } else if (obj === CALL || obj === APPLY || obj === BIND) {
            throw 'Referencing call, apply, or bind in Angular expressions is disallowed';
        }
    }

    return obj;
}

function ifDefined(value, defaultValue) {
    return _.isUndefined(value) ? defaultValue : value;
}

function isLiteral(ast) {
    return ast.body.length === 0 ||
        ast.body.length === 1 && (
            ast.body[0].type === AST.Literal ||
            ast.body[0].type === AST.ArrayExpression ||
            ast.body[0].type === AST.ObjectExpression);
}

function markConstantExpressions(ast) {
    var allConstants;
    switch (ast.type) {
        case AST.Program:
            allConstants = true;
            _.forEach(ast.body, function (expr) {
                markConstantExpressions(expr)
                allConstants = allConstants && expr.constant
            })
            ast.constant = allConstants
            break;
        case ASt.Literal:
            ast.constant = true
            break;
        case AST.Identifier:
            ast.constant = false;
            break;
        case AST.ArrayExpression:
            allConstants = true;
            _.forEach(ast.elements, function (element) {
                markConstantExpressions(element);
                allConstants = allConstants && element.constant;
            });
            ast.constant = allConstants;
            break;
        case AST.ObjectExpression:
            allConstants = true;
            _.forEach(ast.properties, function (property) {
                markConstantExpressions(property.value);
                allConstants = allConstants && property.value.constant;
            });
            ast.constant = allConstants;
            break;
        case AST.ThisExpression:
            ast.constant = false;
            break;
        case AST.MemberExpression:
            markConstantExpressions(ast.object);
            if (ast.computed) {
                markConstantExpressions(ast.property);
            }
            ast.constant = ast.object.constant && (!ast.computed || ast.property.constant);
            break;
        case AST.CallExpression:
            allConstants = ast.filter ? true : false;
            _.forEach(ast.arguments, function (arg) {
                markConstantExpressions(arg);
                allConstants = allConstants && arg.constant;
            })
            ast.constant = allConstants;
            break;
        case AST.AssignmentExpression:
            markConstantExpressions(ast.left);
            markConstantExpressions(ast.right);
            ast.constant = ast.left.constant && ast.right.constant;
            break;
        case AST.UnaryExpression:
            markConstantExpressions(ast.argument);
            ast.constant = ast.argument.constant;
            break;
        case AST.BinaryExpression:
        case AST.LogicalExpression:
            markConstantExpressions(ast.left);
            markConstantExpressions(ast.right);
            ast.constant = ast.left.constant && ast.right.constant;
            break;
        case AST.ConditionalExpression:
            markConstantExpressions(ast.test);
            markConstantExpressions(ast.consequent);
            markConstantExpressions(ast.alternate);
            ast.constant =
                ast.test.constant && ast.consequent.constant && ast.alternate.constant;
            break;
    }
}


function constantWatchDelegate(scope, listenerFn, valueEq, watchFn) {
    var unwatch = scope.$watch(
        function () {
            return watchFn(scope);
        },
        function (newValue, oldValue, scope) {
            if (_.isFunction(listenerFn)) {
                listenerFn.apply(this, arguments);
            }
            unwatch();
        },
        valueEq
    );
    return unwatch;
}

function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {
    var lastValue;
    var unwatch = scope.$watch(
        function () {
            return watchFn(scope);
        },
        function (newValue, oldValue, scope) {
            lastValue = newValue;
            if (_.isFunction(listenerFn)) {
                listenerFn.apply(this, arguments);
            }
            if (!_.isUndefined(newValue)) {
                scopt.$$postDigest(function () {
                    if (!_.isUndefined(lastValue)) {
                        unwatch();
                    }
                })
            }
        }, valueEq
    );
    return unwatch;
}


function $ParseProvider() {

    this.$get = ['$filter', function ($filter) {
        return function (expr) {
            switch (typeof expr) {
                case 'string':
                    var lexer = new Lexer();
                    var parser = new Parser(lexer, $filter);
                    var oneTime = false;
                    if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
                        oneTime = true;
                        expr = expr.substring(2);
                    }
                    var parseFn = parser.parse(expr);

                    if (parseFn.constant) {
                        parseFn.$$watchDelegate = constantWatchDelegate;
                    } else if (oneTime) {
                        parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate : oneTimeWatchDelegate;
                    } else if (parseFn.inputs) {
                        parseFn.$$watchDelegate = inputsWatchDelegate;
                    }
                    return parseFn;
                case 'function':
                    return expr;
                default:
                    return _.noop;
            }
        }
    }]

}