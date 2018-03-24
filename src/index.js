const { argv } = require('./args');
const FitnessWorker = require('./fitnessWorker');

//if (argv._[0] == 'work') {
//    FitnessWorker.start(argv);
//} else if (argv._[0] == 'new') {
//    rp({
//        method: 'POST',
//        uri: `${argv.server}/api/jobs`,
//        json: true
//    }).then(res => {
//        console.log('Job id: ', res.jobId);
//    }).catch(err => console.log("Error making new job", err));
//}

var express = require('express');
var app = express();

let started = false;
app.get('/', function (req, res) {
    if (!started && req.query.evals) {
        started = true;
        FitnessWorker.start(parseInt(req.query.evals, 10), parseInt(req.query.batchSize, 10), argv).then(blah => {
            console.log('Finished evals');
            started = false;
            res.send('Finished ' + req.query.evals + ' Evals');
        });
    } else if (started && req.query.evals) {
        res.send('Worker is in progress');
    } else {
        res.send('I guess everything is ok. gimme a damn evals');
    }
});

app.listen(process.env.PORT || 8081);
console.log(`Listening on: ${process.env.PORT || 8081} with args ${JSON.stringify({ server: argv.server, address: argv.address })}`);


