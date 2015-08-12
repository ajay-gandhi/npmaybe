#!/usr/bin/env node

// NPM modules
var meow  = require('meow'),
    osTmp = require('os-tmpdir'),
    fs    = require('fs-extra-promise'),
    spawn = require('child_process').spawn;

var tmp_dir = osTmp() + '/npmaybe';

var cli = meow({
  help: [
    'Usage: npmaybe <file> <modules> [options]',
    '',
    'Options:',
    '',
    '  -r, --remove    Remove modules immediately after finishing',
    ''
  ],
  argv: process.argv
});

// Get args
var file = cli.input[2];
var modules = cli.input.slice(3);

// Ensure args
if (!file) {
  console.log('Error: no file provided');
  process.exit(1);
} else if (modules.length == 0) {
  console.log('Error: no modules provided');
  process.exit(1);
}

// Ensure tmp dir and node_modules
fs
  .ensureDirAsync(tmp_dir)
  .then(function (path, err) {
    if (err) {
      console.trace(err);
      process.exit(1);
    }

    return fs.ensureDirAsync(tmp_dir + '/node_modules');
  })
  .then(function (path, err) {
    if (err) {
      console.trace(err);
      process.exit(1);
    }

    // NPM install to tmp dir
    var install = spawn('npm', ['install', '--prefix', tmp_dir].concat(modules));

    install.on('close', function () {

      var rand_filename = '.' + Math.random().toString(36).substr(2, 5) + file;

      // Edit require reference
      fs
        .readFileAsync(file)
        .then(function (data) {
          data = data.toString();
          for (var i = 0, module = modules[i]; i < modules.length; i++) {
            // Installing from GitHub
            if (module.includes('/')) mod_name = module.match(/\/(.*?)$/)[1];

            // From NPM repo
            else                      mod_name = module;

            data = data.replace(module, tmp_dir + '/node_modules/' + mod_name);
          }

          // Write to new local temp file
          return fs.writeFileAsync(rand_filename, data);
        })
        .then(function (err) {
          if (err) {
            console.trace(err);
            process.exit(0);
          }

          var run = spawn('node', [rand_filename]);

          var output = '',
              code;

          run.stdout.on('data', function (data) {
            output += data.toString();
          });

          run.stderr.on('data', function (data) {
            console.trace(data.toString());
          });

          run.on('close', function (c) {
            // Print output from file that was run
            process.stdout.write(output);
            code = c;

            // Remove tmp file
            fs
              .removeAsync(rand_filename)
              .then(function () {

                // Have to delete tmps now
                if (cli.flags.r || cli.flags.remove) return fs.removeAsync(tmp_dir);

                // Finished
                else return;
              })
              .then(function () {
                // Now finished
                process.exit(c);
              });
          });

        });
    });
  });
