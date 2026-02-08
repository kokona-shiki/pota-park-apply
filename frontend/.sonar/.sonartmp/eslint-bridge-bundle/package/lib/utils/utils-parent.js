"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ancestorsChain = exports.localAncestorsChain = exports.findFirstMatchingAncestor = exports.findFirstMatchingLocalAncestor = void 0;
const utils_ast_1 = require("./utils-ast");
function findFirstMatchingLocalAncestor(node, predicate) {
    return localAncestorsChain(node).find(predicate);
}
exports.findFirstMatchingLocalAncestor = findFirstMatchingLocalAncestor;
function findFirstMatchingAncestor(node, predicate) {
    return ancestorsChain(node, new Set()).find(predicate);
}
exports.findFirstMatchingAncestor = findFirstMatchingAncestor;
function localAncestorsChain(node) {
    return ancestorsChain(node, utils_ast_1.functionLike);
}
exports.localAncestorsChain = localAncestorsChain;
function ancestorsChain(node, boundaryTypes) {
    const chain = [];
    let currentNode = node.parent;
    while (currentNode) {
        chain.push(currentNode);
        if (boundaryTypes.has(currentNode.type)) {
            break;
        }
        currentNode = currentNode.parent;
    }
    return chain;
}
exports.ancestorsChain = ancestorsChain;
//# sourceMappingURL=utils-parent.js.map