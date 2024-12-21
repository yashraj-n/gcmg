"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore Types are not availible
const args_parser_1 = __importDefault(require("args-parser"));
const configure_1 = require("./configure");
const utils_1 = require("./utils");
const generate_1 = require("./generate");
const args = (0, args_parser_1.default)(process.argv);
if (args.config) {
    (0, configure_1.configure)().then(() => {
        console.log('Configuration complete!');
        process.exit(0);
    });
}
else if (!(0, utils_1.doesConfigFileExist)()) {
    console.warn('Configuration file does not exist. Please run the following command to configure the application:');
    console.warn('git-cmg config');
    process.exit(1);
}
else {
    (0, generate_1.generateCommitMessage)().then(r => console.log("Goodbye!"));
}
