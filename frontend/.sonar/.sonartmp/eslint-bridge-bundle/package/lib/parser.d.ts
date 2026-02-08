import { Linter, SourceCode } from 'eslint';
import { ParsingError } from './analyzer';
export declare const PARSER_CONFIG_MODULE: Linter.ParserOptions;
export declare const PARSER_CONFIG_SCRIPT: Linter.ParserOptions;
export declare type Parse = (fileContent: string, filePath: string, tsConfigs?: string[]) => SourceCode | ParsingError;
export declare function parseJavaScriptSourceFile(fileContent: string, filePath: string, tsConfigs?: string[]): SourceCode | ParsingError;
export declare function parseTypeScriptSourceFile(fileContent: string, filePath: string, tsConfigs?: string[]): SourceCode | ParsingError;
export declare function unloadTypeScriptEslint(): void;
export declare function parseJavaScriptVueSourceFile(fileContent: string, filePath: string, tsConfigs?: string[]): SourceCode | ParsingError;
export declare function parseTypeScriptVueSourceFile(fileContent: string, filePath: string, tsConfigs?: string[]): SourceCode | ParsingError;
export declare function parse(parse: Function, config: Linter.ParserOptions, fileContent: string): SourceCode | ParseException;
export declare type ParseException = {
    lineNumber?: number;
    message: string;
    code: string;
};
export declare enum ParseExceptionCode {
    Parsing = "PARSING",
    MissingTypeScript = "MISSING_TYPESCRIPT",
    UnsupportedTypeScript = "UNSUPPORTED_TYPESCRIPT",
    FailingTypeScript = "FAILING_TYPESCRIPT",
    GeneralError = "GENERAL_ERROR"
}
export declare function parseExceptionCodeOf(exceptionMsg: string): ParseExceptionCode;
export declare function babelConfig(config: Linter.ParserOptions): {
    requireConfigFile: boolean;
    babelOptions: {
        presets: string[];
        babelrc: boolean;
        configFile: boolean;
    };
    ecmaVersion?: 2018 | 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 2015 | 2016 | 2017 | 2019 | 2020 | undefined;
    sourceType?: "module" | "script" | undefined;
    ecmaFeatures?: {
        [key: string]: any;
        globalReturn?: boolean | undefined;
        impliedStrict?: boolean | undefined;
        jsx?: boolean | undefined;
        experimentalObjectRestSpread?: boolean | undefined;
    } | undefined;
};
