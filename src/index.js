const exit = (exitCode) => {
    console.log('\n');
    process.exit(exitCode);
};

process.on('exit', exit);
process.on('SIGINT', exit);

const { argv } = require('./args');
const FitnessWorker = require('./fitnessWorker');
const rp = require('request-promise-native');
const fs = require('fs');
process.title = "bbworker";

if (argv._[0] == 'work') {
    FitnessWorker.start(argv);
} else if (argv._[0] == 'new') {
    rp({
        method: 'POST',
        uri: `${argv.server}/api/jobs`,
        json: true,
        formData: {
            config: fs.readFileSync(argv.config, "utf-8"),
            file : {
                value: fs.createReadStream(argv.file),
                options: {
                    contentType: "multipart/form-data",
                }
            }
        }
    }).then(res => {
        console.log('Job id: ', res.jobId);
    }).catch(err => console.log("Error making new job", err));
}

