'use strict';

let build = require('@microsoft/gulp-core-build');
let typescript = require('@microsoft/gulp-core-build-typescript').typescript;
let apiExtractor = require('@microsoft/gulp-core-build-typescript').apiExtractor;

typescript.setConfig({ typescript: require('typescript') });

build.task('default', build.serial(typescript, apiExtractor));

build.initialize(require('gulp'));

