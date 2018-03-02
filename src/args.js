module.exports = {
    argv: require('yargs')
        .usage('Usage: $0 <command> [options]')

        // 'new' Command
        .command('new', 'start a new job, returns the job id')
        .example('$0 new [-s http://localhost:8089]')

        // 'work' Command
        .command('work', 'start working on an existing job', (Argv) => {
            return Argv
                .option('j', {
                    alias: 'job',
                    type: 'number',
                    demand: "Please specify job id with '-j'",
                    nargs: 1,
                    describe: 'Job id to contribute to'
                })
                .option('a', {
                    alias: 'address',
                    type: 'string',
                    demand: "Please address to pay with '-a'",
                    nargs: 1,
                    describe: 'Ethereum address to pay shares of the bounty to'
                })
        })
        .example('$0 work -a 0x0 -j 1 [-s http://localhost:8089]')

        .demandCommand(1, 'Please specify one of the commands!')
        .strict(true)

        .option('s', {
            alias: 'server',
            type: 'string',
            describe: 'Optional parameter to specify the api server to use',
            default: 'http://localhost:8089'
        })

        .help('h')
        .alias('h', 'help')
        .wrap(null).argv
}