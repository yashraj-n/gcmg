# Git Commit Message Generator

A command-line tool that uses AI to automatically generate meaningful and well-formatted Git commit messages based on your code changes. It supports multiple AI providers including OpenAI, Anthropic, Google, Groq, and Perplexity.

## Features

- Automatic commit message generation based on git diff
- Support for multiple AI providers:
    - OpenAI (GPT-4 and variants)
    - Anthropic (Claude models)
    - Google Generative AI (Gemini models)
    - Google Vertex AI
    - Groq (LLaMA and Mixtral models)
    - Perplexity (Sonar models)
- Interactive configuration setup
- Standardized commit message format
- Optional automatic git add, commit, and push operations
- Cross-platform support (Windows, macOS, Linux)

## Installation

```bash
npm install -g gcmg
```

## Command Aliases

The tool can be invoked using any of these commands:
```bash
gcmg                     # Short alias
git-cmg                  # Git-style alias
git-commit-msg-generate  # Full name
```

All commands work exactly the same way - use whichever you prefer!

## Setup

1. Run the configuration command (using any of the aliases):
```bash
gcmg config
# or
git-cmg config
# or
git-commit-msg-generate config
```

2. Follow the interactive prompts to:
    - Select your preferred AI provider
    - Choose an AI model
    - Enter your API key

The configuration will be saved in:
- Windows: `%APPDATA%\Git Commit Message Generator\config.json`
- macOS: `~/Library/Application Support/Git Commit Message Generator/config.json`
- Linux: `~/.config/Git Commit Message Generator/config.json`

## Usage

1. Make changes to your code
2. Run the generator using any of the aliases:
```bash
gcmg
```

3. The tool will:
    - Get the current git diff
    - Generate a commit message using the configured AI provider
    - Show you the generated message
    - Ask if you want to commit the changes
    - Optionally push the changes to remote

## Commit Message Format

Generated commit messages follow this format:
```
[<type>] <Title>
- Detail 1
- Detail 2
- Detail 3
- Detail 4
... <Conclusion>
```

Where `<type>` can be:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks

## Requirements

- Node.js 14 or higher
- Git installed and configured
- API key for your chosen AI provider

## Dependencies

- Enquirer: Interactive CLI prompts
- Zod: Runtime type checking
- args-parser: Command line argument parsing
- Various AI provider SDKs (@ai-sdk/*)

## Error Handling

The tool includes comprehensive error handling for:
- Git command failures
- AI provider initialization issues
- Configuration loading problems
- Network connectivity issues

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using the tool itself! (`gcmg`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue in the GitHub repository.