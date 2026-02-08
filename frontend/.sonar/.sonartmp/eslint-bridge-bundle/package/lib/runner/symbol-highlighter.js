"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.symbolHighlightingRuleId = void 0;
exports.symbolHighlightingRuleId = 'internal-symbol-highlighting';
/**
 * Using rule as we need to access declared variables which are available only with RuleContext
 */
exports.rule = {
    create(context) {
        let variables;
        /*
           Remove TypeAnnotation part from location of identifier for purpose of symbol highlighting.
           This was motivated by following code
    
             var XMLHttpRequest: {
               new(): XMLHttpRequest; // this is reference to var, not interface
             };
             interface XMLHttpRequest  {}
    
           where XMLHttpRequest is both type and variable name. Issue type annotation inside the variable declaration
           is reference to the variable (this is likely a bug in parser), which causes overlap between declaration and
           reference, which makes SQ API fail with RuntimeException. As a workaround we remove TypeAnnotation part of
           identifier node from its location, so no overlap is possible (arguably this is also better UX for symbol
           highlighting).
         */
        function identifierLocation(node) {
            const source = context.getSourceCode();
            const loc = {
                start: node.loc.start,
                end: node.type === 'Identifier' && node.typeAnnotation
                    ? source.getLocFromIndex(node.typeAnnotation.range[0])
                    : node.loc.end,
            };
            return location(loc);
        }
        return {
            Program() {
                // clear "variables" for each file
                variables = new Set();
            },
            '*': (node) => {
                context.getDeclaredVariables(node).forEach(v => variables.add(v));
            },
            'Program:exit': (node) => {
                const result = [];
                variables.forEach(v => {
                    // if variable is initialized during declaration it is part of references as well
                    // so we merge declarations and references to remove duplicates and take the earliest in the file as the declaration
                    const allRef = [
                        ...new Set([...v.defs.map(d => d.name), ...v.references.map(r => r.identifier)]),
                    ]
                        .filter(i => !!i.loc)
                        .sort((a, b) => a.loc.start.line - b.loc.start.line);
                    if (allRef.length === 0) {
                        // defensive check, this should never happen
                        return;
                    }
                    const highlightedSymbol = {
                        declaration: identifierLocation(allRef[0]),
                        references: allRef.slice(1).map(r => identifierLocation(r)),
                    };
                    result.push(highlightedSymbol);
                });
                const openCurlyBracesStack = [];
                context.getSourceCode().ast.tokens.forEach(token => {
                    if (token.type === 'Punctuator') {
                        if (token.value === '{') {
                            openCurlyBracesStack.push(token);
                        }
                        if (token.value === '}') {
                            const highlightedSymbol = {
                                declaration: location(openCurlyBracesStack.pop().loc),
                                references: [location(token.loc)],
                            };
                            result.push(highlightedSymbol);
                        }
                    }
                });
                // as issues are the only communication channel of a rule
                // we pass data as serialized json as an issue message
                context.report({ node, message: JSON.stringify(result) });
            },
        };
    },
};
function location(loc) {
    return {
        startLine: loc.start.line,
        startCol: loc.start.column,
        endLine: loc.end.line,
        endCol: loc.end.column,
    };
}
//# sourceMappingURL=symbol-highlighter.js.map