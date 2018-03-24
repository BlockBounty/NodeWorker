const DEFAULT_BATCH_SIZE = 5;

const rp = require('request-promise-native');

let wasmExports, currentJobId;

let evaluations = 0;

let start = (totalEvals, batchSize, argv) => {
	batchSize = batchSize || DEFAULT_BATCH_SIZE;
    console.log('Fitness Evaluations: ' + evaluations++);
    return getNextJob(batchSize, argv)
        .then((res) => Promise.all([
            getWasmExports(res.jobId, argv.server),
            Promise.resolve({ controller: res.controller, seed: res.seed, controllerId: res.id, jobId: res.jobId })
        ])).then(([wasmExports, jobInfo]) => {
            pushController(jobInfo.controller, wasmExports);
            wasmExports.init(420);
            return Promise.resolve({
                fitness: wasmExports.getFitness(),
                steps: wasmExports.getSteps(),
                seed: jobInfo.seed,
                jobId: jobInfo.jobId,
                controllerId: jobInfo.controllerId
            });
        }).then(results => {
            return postJobResults(argv.address, results, argv.server);
        }).then(() => {
        	if (evaluations >= totalEvals) {
        		evaluations = 0;
        		return Promise.resolve();

        	} else {
        		return start(totalEvals, argv);
        	}
        }).catch(err => console.log(err));
}

let batchedJobs = [];
let getNextJob = (batchSize, argv) => {
    if (batchedJobs.length != 0) {
        return Promise.resolve(batchedJobs.pop());
    }

    const rpConfig = {
        uri: `${argv.server}/api/controllers/${argv.job}?batchSize=${batchSize}`,
        headers: {
            'X-Ether-Address': argv.address
        },
        json: true
    };

    let fetchJob = (resolver, rejecter, failureCount) => {
        rp(rpConfig)
            .then(json => {
                json.controllers.forEach(j => batchedJobs.push(j));
                resolver(batchedJobs.pop());
            })
            .catch(err => {
                console.log(err);

                console.log("Failed to get a job");
                if (failureCount <= 15) {
                    setTimeout(() => fetchJob(resolver, rejecter, ++failureCount), 1000);
                } else {
                    rejecter(`Giving up on job ${argv.job} at server ${argv.server}`);
                }
            });
    }

    return new Promise((resolver, rejecter) => {
        fetchJob(resolver, rejecter, 0);
    });
};

let getWasmExports = (jobId, apiUrl) => {
    if (jobId == currentJobId && wasmExports) {
        return Promise.resolve(wasmExports);
    }

    currentJobId = jobId;

    return rp({
        uri: `${apiUrl}/api/wasm/${jobId}`,
        resolveWithFullResponse: true,
        encoding: null
    }).then(response => {
        if (response.statusCode == 200) {
            return response.body;
        } else {
            throw new Error('Failed to get a job');
        }
    }).then(moduleByteCode => WebAssembly.instantiate(moduleByteCode, {
        memory: new WebAssembly.Memory({ initial: 3 })
    })).then(results => {
        wasmExports = results.instance.exports;
        return wasmExports;
    });
};

let pushController = (controller, wasmExports) => {
    controller.split(' ').forEach(c => {
        if (!isNaN(c)) {
            wasmExports.pushFloat(Number(c));
        } else {
            wasmExports.pushByte(c.charCodeAt(0));
        }
    });

    wasmExports.pushByte('='.charCodeAt(0));
};

let batchedJobResults = [];
let postJobResults = (address, results, apiUrl) => {
    batchedJobResults.push({
        fitness: results.fitness,
        steps: results.steps,
        seed: results.seed,
        controllerId: results.controllerId,
    });

    if (batchedJobs.length > 0) {
        return;
    }

    const postConfig = {
        method: 'POST',
        uri: `${apiUrl}/api/fitness/${results.jobId}`,
        headers: {
            'X-Ether-Address': address,
            'Content-Type': 'application/json'
        },
        body: batchedJobResults,
        json: true
    };
    batchedJobResults = [];

    return new Promise((res) => {
        rp(postConfig).then(() => {
            res();
        }).catch(e => console.log('Failed to post results', e));
    });
}

module.exports = {
    start
};
