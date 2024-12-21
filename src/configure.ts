import Enquirer from 'enquirer';
import Providers from "./providers";
import {ensureConfigFile} from "./utils";
import fs from "fs";

export async function configure() {


    const {provider} = await Enquirer.prompt<{ provider: keyof typeof Providers }>({
        type: 'select',
        name: 'provider',
        message: 'Please Choose AI Provider:',
        choices: Object.keys(Providers)
    });

    const {model, apiKey} = await Enquirer.prompt<{ model: string, apiKey: string }>([{
        type: 'select',
        name: 'model',
        message: 'Please Choose Model:',
        choices: Providers[provider].models
    }, {
        type: "password",
        name: "apiKey",
        message: "Please enter your API Key:"
    }]);

    const configFilePath = ensureConfigFile();

    // Writing
    fs.writeFileSync(configFilePath, JSON.stringify({
        provider,
        model,
        apiKey
    }, null, 2));

    console.log(`Configuration saved to ${configFilePath}`);
}