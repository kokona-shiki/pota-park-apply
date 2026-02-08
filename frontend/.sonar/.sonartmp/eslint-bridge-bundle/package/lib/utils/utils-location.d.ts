import * as estree from 'estree';
import { AST } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
export declare function toEncodedMessage(message: string, secondaryLocationsHolder: Array<AST.Token | TSESTree.Node | estree.Node>, secondaryMessages?: (string | undefined)[], cost?: number): string;
