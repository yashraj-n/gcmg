import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Determine the appropriate directory for storing config files
function getConfigDirectory(appName: string): string {
    const homeDir = os.homedir();

    if (process.platform === 'win32') {
        // Windows: Use the %APPDATA% directory
        return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), appName);
    } else if (process.platform === 'darwin') {
        // macOS: Use ~/Library/Application Support
        return path.join(homeDir, 'Library', 'Application Support', appName);
    } else {
        // Linux/Unix: Use ~/.config
        return path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appName);
    }
}

// Create the config.json file if it doesn't exist and return the file path
export function ensureConfigFile(): string {
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

export function doesConfigFileExist(): boolean {
    const configDir = getConfigDirectory('Git Commit Message Generator');
    const configFilePath = path.join(configDir, 'config.json');

    return fs.existsSync(configFilePath);
}

