"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommitMessage = generateCommitMessage;
const utils_1 = require("./utils");
const ai_1 = require("ai");
const node_child_process_1 = require("node:child_process");
const promises_1 = require("fs/promises");
const zod_1 = require("zod");
const providers_1 = __importDefault(require("./providers"));
const enquirer_1 = __importDefault(require("enquirer"));
// Constants
const COMMIT_PROMPT = `Your job is to write GitHub commit for this diff. Only send the commit message. Format:

[<type>] <Title>
- Detail 1
- Detail 2
- Detail 3
- Details 4
... <Conclusion>

Make sure to include the type of commit (feat, fix, docs, style, refactor, test, chore etc...) in square brackets.
Make sure you follow format strictly unless told otherwise.
Make sure message is well detailed and has every change mentioned in the diff.
*If no diff is there, send 'No Changed Detected.'*`;
// Config validation schema
const configSchema = zod_1.z.object({
    provider: zod_1.z.string(),
    model: zod_1.z.string(),
    apiKey: zod_1.z.string()
});
// Helper functions
const getDiff = () => {
    try {
        return (0, node_child_process_1.execSync)("git --no-pager diff", { encoding: 'utf8' });
    }
    catch (error) {
        throw new Error(`Failed to get git diff: ${error}`);
    }
};
const loadConfig = (configPath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const configData = yield (0, promises_1.readFile)(configPath, 'utf8');
        const config = JSON.parse(configData);
        return configSchema.parse(config);
    }
    catch (error) {
        throw new Error(`Failed to load config: ${error}`);
    }
});
const initializeAIProvider = (config) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const providerInfo = providers_1.default[config.provider];
        if (!providerInfo) {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
        const providerPkg = yield Promise.resolve(`${`@ai-sdk/${providerInfo.id}`}`).then(s => __importStar(require(s)));
        const creatorName = `create${config.provider.replace(/\s/g, '')}`;
        const creator = providerPkg[creatorName];
        if (typeof creator !== 'function') {
            throw new Error(`Invalid provider configuration for ${config.provider}`);
        }
        return creator(Object.assign({ apiKey: config.apiKey }, providerInfo.additional));
    }
    catch (error) {
        throw new Error(`Failed to initialize AI provider: ${error}`);
    }
});
const executeGitCommand = (command) => {
    try {
        (0, node_child_process_1.execSync)(command, { stdio: 'inherit' });
    }
    catch (error) {
        throw new Error(`Git command failed: ${error}`);
    }
};
const confirmAction = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield enquirer_1.default.prompt({
        type: 'confirm',
        name: 'confirm',
        message,
    });
    return response.confirm;
});
const addAndCommit = (commitMessage) => __awaiter(void 0, void 0, void 0, function* () {
    const shouldProceed = yield confirmAction('Do you want to add and commit these changes?');
    if (!shouldProceed)
        return process.exit(0);
    try {
        executeGitCommand('git add .');
        executeGitCommand(`git commit -m "${commitMessage}`);
        console.log('✅ Changes committed successfully');
    }
    catch (error) {
        console.error('❌ Failed to commit changes:', error);
        throw error;
    }
});
const pushChanges = () => __awaiter(void 0, void 0, void 0, function* () {
    const shouldPush = yield confirmAction('Do you want to push the changes?');
    if (!shouldPush)
        return;
    try {
        executeGitCommand('git push');
        console.log('✅ Changes pushed successfully');
    }
    catch (error) {
        console.error('❌ Failed to push changes:', error);
        throw error;
    }
});
function generateCommitMessage() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Load and validate configuration
            const config = yield loadConfig((0, utils_1.ensureConfigFile)());
            // Initialize AI provider
            const aiProvider = yield initializeAIProvider(config);
            // Get git diff
            const diff = getDiff();
            if (!diff.trim()) {
                console.log('No Changes Detected.');
                return;
            }
            // Generate commit message
            const result = yield (0, ai_1.generateText)({
                model: aiProvider(config.model),
                prompt: `${COMMIT_PROMPT}\n${diff}`,
            });
            const commitMessage = result.text.trim();
            console.log('\nGenerated commit message:');
            console.log(commitMessage);
            // Handle git operations
            yield addAndCommit(commitMessage);
            yield pushChanges();
        }
        catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    });
}
