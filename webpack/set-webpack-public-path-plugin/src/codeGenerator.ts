/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

import { EOL } from 'os';
import * as uglify from 'uglify-js';

import {
  ISetWebpackPublicPathOptions
} from './SetPublicPathPlugin';

export const registryVarName: string = 'window.__setWebpackPublicPathLoaderSrcRegistry__';

export interface IInternalOptions extends ISetWebpackPublicPathOptions {
  webpackPublicPathVariable?: string;
  regexName?: string;
  linePrefix?: string;
}

export function getSetPublicPathCode(options: IInternalOptions, emitWarning: (warning: string) => void): string {
  if (!options.webpackPublicPathVariable) {
    throw '"webpackPublicPathVariable" option must be defined.';
  }

  let lines: string[] = [];
  if (options.regexName) {
    // Double-escape backslashes to make them show up as single backslashes in regexps.
    const escapedRegex: string = options.regexName.replace(/\\/, '\\\\');

    lines = [
      `var scripts = document.getElementsByTagName('script');`
    ];

    const regexInitializationSnippet: string = `new RegExp('${escapeSingleQuotes(escapedRegex)}', 'i')`;
    const regexVarName: string | undefined = options.regexVariable;
    if (options.regexVariable) {
      lines.push(...[
        `var regex = (typeof ${regexVarName} !== 'undefined') ? ${regexVarName} : ${regexInitializationSnippet};`
      ]);
    } else {
      lines.push(...[
        `var regex = ${regexInitializationSnippet};`
      ]);
    }

    lines.push(...[
      'var found = false;',
      '',
      'if (scripts && scripts.length) {',
      '  for (var i = 0; i < scripts.length; i++) {',
      '    if (!scripts[i]) continue;',
      `    var path = scripts[i].getAttribute('src');`,
      '    if (path && path.match(regex)) {',
      `      ${options.webpackPublicPathVariable} = path.substring(0, path.lastIndexOf('/') + 1);`,
      '      found = true;',
      '      break;',
      '    }',
      '  }',
      '}',
      '',
      'if (!found) {',
      `  for (var global in ${registryVarName}) {`,
      '    if (global && global.match(regex)) {',
      `      ${options.webpackPublicPathVariable} = global.substring(0, global.lastIndexOf('/') + 1);`,
      '      break;',
      '    }',
      '  }',
      '}'
    ]);
  } else {
    if (options.publicPath) {
      lines = [
        `var publicPath = '${appendSlashAndEscapeSingleQuotes(options.publicPath)}';`
      ];
    } else if (options.systemJs) {
      lines = [
        `var publicPath = window.System ? window.System.baseURL || '' : '';`,
        `if (publicPath !== '' && publicPath.substr(-1) !== '/') publicPath += '/';`
      ];
    } else {
      emitWarning(`Neither 'publicPath' nor 'systemJs' is defined, so the public path will not be modified`);

      return '';
    }

    if (options.urlPrefix && options.urlPrefix !== '') {
      lines.push(
        '',
        `publicPath += '${appendSlashAndEscapeSingleQuotes(options.urlPrefix)}';`);
    }

    lines.push(
      '',
      `${options.webpackPublicPathVariable} = publicPath;`
    );
  }

  return joinLines(lines, options.linePrefix);
}

/**
 * /**
 * This function returns a block of JavaScript that maintains a global register of script tags.
 *
 * @param debug - If true, the code returned code is not minified. Defaults to false.
 *
 * @public
 */
export function getGlobalRegisterCode(debug: boolean = false): string {
  const lines: string[] = [
    '(function(){',
    `if (!${registryVarName}) ${registryVarName}={};`,
    `var scripts = document.getElementsByTagName('script');`,
    'if (scripts && scripts.length) {',
    '  for (var i = 0; i < scripts.length; i++) {',
    '    if (!scripts[i]) continue;',
    `    var path = scripts[i].getAttribute('src');`,
    `    if (path) ${registryVarName}[path]=true;`,
    '  }',
    '}',
    '})();'
  ];

  const joinedScript: string = joinLines(lines);

  if (debug) {
    return `${EOL}${joinedScript}`;
  } else {
    const uglified: uglify.AST_Toplevel = uglify.parse(joinedScript);
    uglified.figure_out_scope();
    const compressor: uglify.AST_Toplevel = uglify.Compressor({
      dead_code: true
    });
    const compressed: uglify.AST_Toplevel = uglified.transform(compressor);
    compressed.figure_out_scope();
    compressed.compute_char_frequency();
    compressed.mangle_names();
    return `${EOL}${compressed.print_to_string()}`;
  }
}

function joinLines(lines: string[], linePrefix?: string): string {
  return lines.map((line: string) => {
    if (!!line) {
      return `${linePrefix || ''}${line}`;
    } else {
      return line;
    }
  }).join(EOL).replace(new RegExp(`${EOL}${EOL}+`, 'g'), `${EOL}${EOL}`);
}

function escapeSingleQuotes(str: string): string | undefined {
  if (str) {
    return str.replace('\'', '\\\'');
  } else {
    return undefined;
  }
}

function appendSlashAndEscapeSingleQuotes(str: string): string | undefined {
  if (str && str.substr(-1) !== '/') {
    str = str + '/';
  }

  return escapeSingleQuotes(str);
}
