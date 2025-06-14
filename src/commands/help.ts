import chalk from "chalk";

export function showHelp() {
  console.log(`
 ██████╗  ██████╗███╗   ███╗ ██████╗ 
██╔════╝ ██╔════╝████╗ ████║██╔════╝ 
██║  ███╗██║     ██╔████╔██║██║  ███╗
██║   ██║██║     ██║╚██╔╝██║██║   ██║
╚██████╔╝╚██████╗██║ ╚═╝ ██║╚██████╔╝
 ╚═════╝  ╚═════╝╚═╝     ╚═╝ ╚═════╝ 
    `);
  console.log(chalk.bold.white('Usage:'));
  console.log(chalk.greenBright('  gcmg') + chalk.white('    Generates a commit message based on the changes in the current directory'));
  console.log(chalk.greenBright('  gcmg <query>') + chalk.white('    Generate a commit message based on your query'));
  console.log(chalk.greenBright('  gcmg config') + chalk.white('   Configure application settings'));
  console.log(chalk.greenBright('  gcmg edit') + chalk.white('    Edit configuration (prompts, API keys)'));
  console.log(chalk.greenBright('  gcmg help') + chalk.white('    Show this help message\n'));

  console.log(chalk.bold.white('Examples:'));
  console.log(chalk.greenBright('  gcmg') + chalk.whiteBright(' - Generates a commit message based on the changes in the current directory'));
  console.log(chalk.greenBright('  gcmg ') + chalk.bold.magenta('how to remove secrets from reflog') + chalk.whiteBright(' - Generates a commit message based on the changes in the current directory'));
}
