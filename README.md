<div align="center">

# 🚀 GCMG - Git Commit Message Generator

[![npm version](https://badge.fury.io/js/gcmg.svg)](https://badge.fury.io/js/gcmg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)

**🤖 Intelligent AI-powered commit message generation for developers who value quality and consistency**

*Transform your git workflow with smart, standardized commit messages generated from your actual code changes*

![Demo](./assets/demo.gif)

</div>

---

## ✨ Features

🎯 **Smart Commit Generation** - Analyzes your `git diff` to create meaningful, descriptive commit messages  
🤖 **Multi-AI Provider Support** - Choose from OpenAI, Anthropic, Google, Groq, and more  
⚡ **Lightning Fast** - Built with esbuild for optimal performance  
🔧 **Interactive Setup** - Guided configuration with beautiful CLI prompts  
📝 **Standardized Format** - Consistent commit message structure across your projects  
🌍 **Cross-Platform** - Works seamlessly on Windows, macOS, and Linux  
🔄 **Auto Git Operations** - Optional automatic add, commit, and push workflow  
💬 **AI Query Mode** - Ask questions about git commands and get instant help  

## 🎨 What Makes GCMG Special?

### 🧠 **Intelligent Analysis**
- Reads your actual code changes via `git diff`
- Understands context and generates relevant commit messages
- Handles large diffs intelligently (with smart 10k character limit)

### 🎭 **Multiple AI Personalities**
Choose from the industry's best AI models:

| Provider | Models Available | Strengths |
|----------|-----------------|-----------|
| **OpenAI** | GPT-4, GPT-4o, o1, o3-mini | Most versatile, excellent reasoning |
| **Anthropic** | Claude-4, Claude-3.5 Sonnet/Haiku | Superior code understanding |
| **Google** | Gemini 2.0, Gemini 1.5 Pro/Flash | Fast and efficient |
| **Groq** | Llama 3.3, Mixtral, Qwen | Lightning-fast inference |
| **Google Vertex** | Enterprise Gemini models | Enterprise-grade reliability |

### 🎯 **Perfect Commit Format**
Every generated message follows this proven structure:
```
[feat] Add user authentication system
- Implement JWT token-based authentication
- Add login and logout endpoints
- Create user session management
- Add password encryption with bcrypt
... Enhances application security and user management
```

## 🚀 Quick Start

### Installation
```bash
npm install -g gcmg
```

### Setup (One-time)
```bash
gcmg config
```
Follow the interactive prompts to:
1. 🎯 Select your preferred AI provider
2. 🤖 Choose an AI model
3. 🔑 Enter your API key

### Usage
```bash
# Make your changes
git add .

# Generate and commit
gcmg

# Or ask for help
gcmg "how do I remove sensitive data from git history?"
```

## 🎪 Command Showcase

GCMG provides multiple command aliases for maximum convenience:

```bash
gcmg                           # 🚀 Primary command
git-cmg                        # 🔧 Git-style alias  
git-commit-msg-generate        # 📝 Descriptive alias
```

### 🎨 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `gcmg` | 🎯 Generate commit message from changes | `gcmg` |
| `gcmg config` | ⚙️ Interactive configuration setup | `gcmg config` |
| `gcmg edit` | ✏️ Edit configuration file | `gcmg edit` |
| `gcmg help` | 📚 Show beautiful help message | `gcmg help` |
| `gcmg <query>` | 💬 Ask git-related questions | `gcmg "revert last commit"` |

## 🛠️ Configuration

Configuration is stored securely in platform-appropriate locations:

- **Windows:** `%APPDATA%\gcmg\.gcmg-config`
- **macOS:** `~/Library/Application Support/gcmg/.gcmg-config`
- **Linux:** `~/.config/gcmg/.gcmg-config`

### 🔧 Configuration Structure
```json
{
  "name": "OpenAI",
  "provider": "@ai-sdk/openai",
  "model": "gpt-4o",
  "apiKey": "your-api-key",
  "prompts": {
    "commit": "Your custom commit prompt...",
    "help": "Your custom help prompt..."
  }
}
```

## 🎭 Advanced Features

### 🤖 **AI Query Mode**
Get instant help with git commands:
```bash
gcmg "how to merge branches safely"
gcmg "undo last commit but keep changes"
gcmg "remove file from git history"
```

### ⚡ **Smart Diff Handling**
- Automatically detects when no changes exist
- Warns about large diffs (>10k characters)
- Handles binary files and complex changes intelligently

### 🔄 **Streamlined Workflow**
1. **Analyze** - Reads your git diff
2. **Generate** - Creates intelligent commit message
3. **Review** - Shows you the proposed message
4. **Commit** - Optionally commits with `git add . && git commit`
5. **Push** - Optionally pushes to remote repository

## 🏗️ Architecture

GCMG is built with modern development practices:

- **TypeScript** - Type-safe development
- **ESBuild** - Lightning-fast compilation
- **Vercel AI SDK** - Unified AI provider interface
- **Enquirer** - Beautiful interactive prompts
- **Zod** - Runtime type validation
- **Cross-platform** - Works everywhere Node.js runs

### 📁 Project Structure
```
gcmg/
├── src/
│   ├── commands/         # 🎯 CLI command implementations
│   ├── lib/             # 🔧 Core libraries (config, LLM, models)
│   ├── scripts/         # 🛠️ Build and utility scripts
│   └── prompts.ts       # 💬 AI prompt templates
├── assets/              # 🎨 Visual assets
└── dist/               # 📦 Built output
```

## 🎨 Commit Types

GCMG automatically categorizes your changes:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | ✨ New features | `[feat] Add dark mode toggle` |
| `fix` | 🐛 Bug fixes | `[fix] Resolve login validation error` |
| `docs` | 📚 Documentation | `[docs] Update API documentation` |
| `style` | 💄 Code formatting | `[style] Fix indentation and spacing` |
| `refactor` | ♻️ Code refactoring | `[refactor] Simplify user service logic` |
| `test` | 🧪 Testing | `[test] Add unit tests for auth module` |
| `chore` | 🔧 Maintenance | `[chore] Update dependencies` |

## 🤝 Contributing

We love contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes using GCMG itself! (`gcmg`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 🛠️ Development Setup
```bash
git clone https://github.com/yashraj-n/gcmg.git
cd gcmg
npm install
npm run build
```

## 📊 Why Choose GCMG?

### 🎯 **Before GCMG**
```
git commit -m "fix stuff"
git commit -m "update"
git commit -m "asdfgh"
```

### ✨ **After GCMG**
```
[fix] Resolve authentication middleware validation error
- Fix JWT token verification logic
- Add proper error handling for expired tokens
- Update middleware to handle edge cases
- Add comprehensive logging for debugging
... Improves application security and user experience
```

## 🌟 Real-World Example

```bash
$ gcmg
✓ Getting Changes...
✓ Generating Commit Message...

[feat] Implement user profile management system
- Add user profile CRUD operations
- Create profile update validation
- Implement avatar upload functionality
- Add email verification for profile changes
- Create comprehensive user settings page
... Enhances user experience with complete profile control

? Do you want to add and commit these changes? › Yes
✓ Changes committed successfully
? Do you want to push the changes? › Yes
✓ Changes pushed successfully
👋 Goodbye!
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">

**⭐ Star this repo if GCMG helps improve your git workflow! ⭐**

[🐛 Report Bug](https://github.com/yashraj-n/gcmg/issues) · [✨ Request Feature](https://github.com/yashraj-n/gcmg/issues) · [💬 Discussions](https://github.com/yashraj-n/gcmg/discussions)

Made with 💻 and ☕ for developers who care about quality commits

</div>