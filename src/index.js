const exit = (exitCode) => {
    console.log('\n');
    process.exit(exitCode);
};

process.on('exit', exit);
process.on('SIGINT', exit);

const { argv } = require('./args');
const FitnessWorker = require('./fitnessWorker');
const rp = require('request-promise-native');

if (argv._[0] == 'work') {
    FitnessWorker.start(argv);
} else if (argv._[0] == 'new') {
    rp({
        method: 'POST',
        uri: `${argv.server}/api/jobs`,
        json: true
    }).then(res => {
        console.log('Job id: ', res.jobId);
    }).catch(err => console.log("Error making new job", err));
}

