import { TSESTree } from '@typescript-eslint/experimental-utils';
export declare function findFirstMatchingLocalAncestor(node: TSESTree.Node, predicate: (node: TSESTree.Node) => boolean): TSESTree.Node | undefined;
export declare function findFirstMatchingAncestor(node: TSESTree.Node, predicate: (node: TSESTree.Node) => boolean): TSESTree.Node | undefined;
export declare function localAncestorsChain(node: TSESTree.Node): TSESTree.Node[];
export declare function ancestorsChain(node: TSESTree.Node, boundaryTypes: Set<string>): TSESTree.Node[];
