#!/usr/bin/env node

// NPM modules
var meow      = require('meow'),
    osTmp     = require('os-tmpdir'),
    fs        = require('fs-extra-promise'),
    detective = require('detective'),
    spawn     = require('child_process').spawn;

var tmp = osTmp() + '/npmaybe';

var cli = meow({
  help: [
    'Usage: npmaybe <file> [options]',
    '',
    'Options:',
    '',
    '  -r, --remove    Remove modules immediately after finishing',
    ''
  ],
  argv: process.argv
});

// Get file
var file = cli.input[2];

// Ensure args
if (!file) {
  console.log('Error: no file provided');
  process.exit(1);
}

// Ensure tmp dir and node_modules
var file_contents;
fs
  .ensureDirAsync(tmp)
  .then(function () {
    return fs.ensureDirAsync(tmp + '/node_modules');
  })
  .then(function () {
    return fs.readFileAsync(file);
  })
  .then(function (contents) {
    file_contents = contents;
    var requires = detective(contents);

    // Want non native modules
    var natives = Object.keys(process.binding('natives'));
    var modules = requires.filter(function (m) {
      return (natives.indexOf(m) < 0);
    });

    // NPM install to tmp dir
    var install = spawn('npm', ['install', '--prefix', tmp].concat(modules));

    install.on('close', function () {

      var rand_fname = '.' + Math.random().toString(36).substr(2, 5) + file;

      // Edit require reference
      fs
        .readFileAsync(file)
        .then(function (data) {
          data = data.toString();
          for (var i = 0, module = modules[i]; i < modules.length; i++) {
            // Installing from GitHub
            if (module.indexOf('/') >= 0)
              m_name = module.match(/\/(.*?)$/)[1];

            // From NPM repo
            else                      m_name = module;

            data = data.replace(module, tmp + '/node_modules/' + m_name);
          }

          // Write to new local temp file
          return fs.writeFileAsync(rand_fname, data);
        })
        .then(function (err) {
          if (err) {
            console.trace(err);
            process.exit(0);
          }

          var run = spawn('node', [rand_fname]);

          var output = '',
              code;

          run.stdout.on('data', function (data) {
            output += data.toString();
          });

          run.stderr.on('data', function (data) {
            console.trace(data.toString());
            process.exit(1);
          });

          run.on('close', function (c) {
            // Print output from file that was run
            process.stdout.write(output);
            code = c;

            // Remove tmp file
            fs
              .removeAsync(rand_fname)
              .then(function () {

                // Have to delete tmps now
                if (cli.flags.r || cli.flags.remove)
                  return fs.removeAsync(tmp);

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
  })
  .catch(function (e) {
    console.trace(e);
  });
