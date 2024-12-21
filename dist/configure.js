"use strict";
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
exports.configure = configure;
const enquirer_1 = __importDefault(require("enquirer"));
const providers_1 = __importDefault(require("./providers"));
const utils_1 = require("./utils");
const fs_1 = __importDefault(require("fs"));
function configure() {
    return __awaiter(this, void 0, void 0, function* () {
        const { provider } = yield enquirer_1.default.prompt({
            type: 'select',
            name: 'provider',
            message: 'Please Choose AI Provider:', // Add a message property
            choices: Object.keys(providers_1.default)
        });
        const { model, apiKey } = yield enquirer_1.default.prompt([{
                type: 'select',
                name: 'model',
                message: 'Please Choose Model:',
                choices: providers_1.default[provider].models
            }, {
                type: "password",
                name: "apiKey",
                message: "Please enter your API Key:"
            }]);
        const configFilePath = (0, utils_1.ensureConfigFile)();
        // Writing
        fs_1.default.writeFileSync(configFilePath, JSON.stringify({
            provider,
            model,
            apiKey
        }, null, 2));
        console.log(`Configuration saved to ${configFilePath}`);
    });
}
