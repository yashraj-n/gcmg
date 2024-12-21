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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigFile = ensureConfigFile;
exports.doesConfigFileExist = doesConfigFileExist;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
// Determine the appropriate directory for storing config files
function getConfigDirectory(appName) {
    const homeDir = os.homedir();
    if (process.platform === 'win32') {
        // Windows: Use the %APPDATA% directory
        return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), appName);
    }
    else if (process.platform === 'darwin') {
        // macOS: Use ~/Library/Application Support
        return path.join(homeDir, 'Library', 'Application Support', appName);
    }
    else {
        // Linux/Unix: Use ~/.config
        return path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appName);
    }
}
// Create the config.json file if it doesn't exist and return the file path
function ensureConfigFile() {
    const configDir = getConfigDirectory('Git Commit Message Generator');
    const configFilePath = path.join(configDir, 'config.json');
    // Check if the directory exists, if not, create it
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    // Check if the config file exists, if not, create it with an empty object
    if (!fs.existsSync(configFilePath)) {
        fs.writeFileSync(configFilePath, JSON.stringify({}, null, 2));
    }
    return configFilePath;
}
function doesConfigFileExist() {
    const configDir = getConfigDirectory('Git Commit Message Generator');
    const configFilePath = path.join(configDir, 'config.json');
    return fs.existsSync(configFilePath);
}
