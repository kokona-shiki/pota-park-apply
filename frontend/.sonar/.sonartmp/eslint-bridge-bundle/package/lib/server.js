"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.start = void 0;
const express_1 = __importDefault(require("express"));
const bodyParser = __importStar(require("body-parser"));
const analyzer_1 = require("./analyzer");
const parser_1 = require("./parser");
const tsconfig_1 = require("./tsconfig");
const MAX_REQUEST_SIZE = '50mb';
function start(port = 0, host = '127.0.0.1', additionalRuleBundles = []) {
    return startServer(analyzer_1.analyzeJavaScript, analyzer_1.analyzeTypeScript, port, host, additionalRuleBundles);
}
exports.start = start;
// exported for test
function startServer(analyzeJS, analyzeTS, port = 0, host = '127.0.0.1', additionalRuleBundles = []) {
    loadAdditionalRuleBundles(additionalRuleBundles);
    return new Promise(resolve => {
        console.log('DEBUG starting eslint-bridge server at port', port);
        let server;
        const app = express_1.default();
        // for parsing application/json requests
        app.use(bodyParser.json({ limit: MAX_REQUEST_SIZE }));
        app.post('/init-linter', (req, resp) => {
            analyzer_1.initLinter(req.body.rules, req.body.environments, req.body.globals);
            resp.send('OK!');
        });
        app.post('/analyze-js', analyze(analyzeJS));
        app.post('/analyze-ts', analyze(analyzeTS));
        app.post('/new-tsconfig', (_request, response) => {
            parser_1.unloadTypeScriptEslint();
            response.send('OK!');
        });
        app.post('/tsconfig-files', (request, response) => {
            try {
                const tsconfig = request.body.tsconfig;
                response.json(tsconfig_1.getFilesForTsConfig(tsconfig));
            }
            catch (e) {
                console.error(e.stack);
                response.json({ error: e.message });
            }
        });
        app.get('/status', (_, resp) => resp.send('OK!'));
        app.post('/close', (_req, resp) => {
            console.log('DEBUG eslint-bridge server will shutdown');
            resp.end(() => {
                server.close();
            });
        });
        server = app.listen(port, host, () => {
            console.log('DEBUG eslint-bridge server is running at port', server.address().port);
            resolve(server);
        });
    });
}
exports.startServer = startServer;
function analyze(analysisFunction) {
    return (request, response) => {
        try {
            const parsedRequest = request.body;
            const analysisResponse = analysisFunction(parsedRequest);
            response.json(analysisResponse);
        }
        catch (e) {
            console.error(e.stack);
            response.json({
                ...analyzer_1.EMPTY_RESPONSE,
                parsingError: {
                    message: e.message,
                    code: parser_1.ParseExceptionCode.GeneralError,
                },
            });
        }
    };
}
function loadAdditionalRuleBundles(additionalRuleBundles) {
    for (const bundle of additionalRuleBundles) {
        const ruleIds = analyzer_1.loadCustomRuleBundle(bundle);
        console.log(`DEBUG Loaded rules ${ruleIds} from ${bundle}`);
    }
}
//# sourceMappingURL=server.js.map