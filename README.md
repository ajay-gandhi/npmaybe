# NPMaybe

Test NPM modules without installing them manually

## What

NPMaybe takes care of the temporary nature of testing modules - just feed it
the file that you want to run, with unmodified `require` statements, and
NPMaybe will run it with the proper dependencies.

## Usage

First, install NPMaybe globally:

    $ npm install -g npmaybe

If you have a file called `index.js`, for example:

```js
var chalk = require('chalk');

console.log(chalk.green('Hello World'));
```

Run your file with `npmaybe`, followed by a list of modules the file needs:

    $ npmaybe index.js chalk

`npmaybe` will run your file with the required dependencies.

## Why

Sometimes when I'm starting a new project, I want to try out a few NPM modules
to see which one fits what I'm doing the best. It gets tedious to `npm install`
them, run my code, then `npm uninstall` the unwanted ones. Usually I just forget
to uninstall them...

## How

NPMaybe first installs the dependencies you list in a temporary directory on
your OS. If you specify, these dependencies can be removed as soon as your
script finishes, otherwise they will be deleted when you reboot.

Then, NPMaybe looks at your file and substitutes the `require` references with
the location the dependencies are. Lastly, NPMaybe spawns your script as a child
process.
