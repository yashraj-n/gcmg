// @ts-ignore Types are not availible
import args_parser from 'args-parser';
import type {ArgsType} from "./types";
import {configure} from "./configure";
import {doesConfigFileExist} from "./utils";
import {generateCommitMessage} from "./generate";

const args: ArgsType = args_parser(process.argv);

if (args.config) {
    configure().then(() => {
        console.log('Configuration complete!');
        process.exit(0);
    });
} else if (!doesConfigFileExist()) {

    console.warn('Configuration file does not exist. Please run the following command to configure the application:');
    console.warn('git-cmg config');
    process.exit(1);
} else {

generateCommitMessage().then(r => console.log("Goodbye!"));
}

