import {ensureConfigFile} from "./utils";
import {generateText} from "ai";
import {execSync} from "node:child_process";
import {readFile} from "fs/promises";
import {z} from "zod";
import providers from "./providers";
import Enquirer from 'enquirer';

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
const configSchema = z.object({
    provider: z.string(),
    model: z.string(),
    apiKey: z.string()
});

// Helper functions
const getDiff = (): string => {
    try {
        return execSync("git --no-pager diff", {encoding: 'utf8'});
    } catch (error) {
        throw new Error(`Failed to get git diff: ${error}`);
    }
};

const loadConfig = async (configPath: string) => {
    try {
        const configData = await readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        return configSchema.parse(config);
    } catch (error) {
        throw new Error(`Failed to load config: ${error}`);
    }
};

const initializeAIProvider = async (config: z.infer<typeof configSchema>) => {
    try {
        const providerInfo = providers[config.provider as keyof typeof providers];
        if (!providerInfo) {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }

        const providerPkg = await import(`@ai-sdk/${providerInfo.id}`);
        const creatorName = `create${config.provider.replace(/\s/g, '')}`;
        const creator = providerPkg[creatorName];

        if (typeof creator !== 'function') {
            throw new Error(`Invalid provider configuration for ${config.provider}`);
        }

        return creator({
            apiKey: config.apiKey,
            ...providerInfo.additional
        });
    } catch (error) {
        throw new Error(`Failed to initialize AI provider: ${error}`);
    }
};

const executeGitCommand = (command: string): void => {
    try {
        execSync(command, {stdio: 'inherit'});
    } catch (error) {
        throw new Error(`Git command failed: ${error}`);
    }
};

const confirmAction = async (message: string): Promise<boolean> => {
    const response = await Enquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message,
    });
    return response.confirm;
};

const addAndCommit = async (commitMessage: string): Promise<void> => {
    const shouldProceed = await confirmAction('Do you want to add and commit these changes?');
    if (!shouldProceed) return process.exit(0);

    try {
        executeGitCommand('git add .');
        executeGitCommand(`git commit -m "${commitMessage}`);
        console.log('✅ Changes committed successfully');
    } catch (error) {
        console.error('❌ Failed to commit changes:', error);
        throw error;
    }
};

const pushChanges = async (): Promise<void> => {
    const shouldPush = await confirmAction('Do you want to push the changes?');
    if (!shouldPush) return;

    try {
        executeGitCommand('git push');
        console.log('✅ Changes pushed successfully');
    } catch (error) {
        console.error('❌ Failed to push changes:', error);
        throw error;
    }
};

export async function generateCommitMessage(): Promise<void> {
    try {
        // Load and validate configuration
        const config = await loadConfig(ensureConfigFile());

        // Initialize AI provider
        const aiProvider = await initializeAIProvider(config);

        // Get git diff
        const diff = getDiff();
        if (!diff.trim()) {
            console.log('No Changes Detected.');
            return;
        }

        // Generate commit message
        const result = await generateText({
            model: aiProvider(config.model),
            prompt: `${COMMIT_PROMPT}\n${diff}`,
        });

        const commitMessage = result.text.trim();
        console.log('\nGenerated commit message:');
        console.log(commitMessage);

        // Handle git operations
        await addAndCommit(commitMessage);
        await pushChanges();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}