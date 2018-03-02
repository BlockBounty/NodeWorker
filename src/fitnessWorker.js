const rp = require('request-promise-native');
const Spinner = require('clui').Spinner;

let wasmExports, currentJobId;

let evaluations = 0;
let status = new Spinner('Going to work', ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'].reverse());

let start = (argv) => {
    if (evaluations == 0) {
        status.start();
    }
    status.message('Fitness Evaluations: ' + evaluations++);
    getNextJob(argv)
        .then(res => {
            // console.log('GRES:', JSON.stringify(res));
            return res;
        })
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
            start(argv);
        }).catch(err => console.log(err));
}

let getNextJob = (argv) => {
    const rpConfig = {
        uri: `${argv.server}/api/controllers/${argv.job}`,
        headers: {
            'X-Ether-Address': argv.address
        },
        json: true
    };

    let fetchJob = (resolver) => {
        // console.log(' GET:', rpConfig.uri);
        rp(rpConfig)
            .then(json => resolver(json))
            .catch(err => {
                console.log(err);
                console.log("Failed to get a job");
                setTimeout(() => fetchJob(resolver), 1000);
            });
    }

    return new Promise((resolver) => {
        fetchJob(resolver);
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

let postJobResults = (address, results, apiUrl) => {
    const postConfig = {
        method: 'POST',
        uri: `${apiUrl}/api/fitness/${results.controllerId}`,
        headers: {
            'X-Ether-Address': address,
            'Content-Type': 'application/json'
        },
        body: {
            fitness: results.fitness,
            steps: results.steps,
            seed: results.seed,
            jobId: results.jobId,
        },
        json: true
    };

    // console.log('POST:', postConfig.uri, ":", results);
    return new Promise((res) => {
        rp(postConfig).then(() => {
            // console.log('PRES');
            res();
        }).catch(e => console.log('Failed to post results', e));
    });
}

module.exports = {
    start
};