let argv = require('yargs')
    .usage('Usage: -a [ether address] -j [job] -s [api_server]')
    .describe('a', 'Ethereum address to pay shares of the bounty to')
    .describe('j', 'Job id to contribute to')
    .describe('s', 'Optional parameter to specify the api server to use')
    .alias('a', 'address')
    .alias('j', 'job')
    .alias('s', 'server')
    .demandOption(['a', 'j'])
    .help('h')
    .alias('h', 'help')
    .default({ 's': 'http://localhost:8089' })
    .number('j')
    .string(['a', 's'])
    .argv;

console.log(JSON.stringify(argv));
