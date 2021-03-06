// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';
import assign = require('object-assign');
import { SchemaValidator, IBuildConfig } from '@microsoft/gulp-core-build';
import ts = require('gulp-typescript');
import * as typescript from 'typescript';

/**
 * @public
 */
export interface ITsConfigFile<T> {
  compilerOptions: T;
}

/* tslint:disable:no-any */
/**
 * A helper class which provides access to the TSConfig.json file for a particular project.
 * It also is a central place for managing the version of typescript which this project
 * should be built with.
 * @public
 */
export class TypeScriptConfiguration {
  private static _baseTsConfig: ITsConfigFile<ts.Settings>;
  private static _typescript: any = undefined;

  /**
   * Gets `gulp-typescript` version of the config (used by TypeScriptTask)
   * Returns a new object each time.
   */
  public static getGulpTypescriptOptions(buildConfig: IBuildConfig): ITsConfigFile<ts.Settings> {
    const file: ITsConfigFile<ts.Settings> = assign({}, this.getTsConfigFile(buildConfig));
    assign(file.compilerOptions, {
      rootDir: buildConfig.rootPath,
      typescript: this.getTypescriptCompiler()
    });
    return file;
  }

  /**
   * Override the version of the typescript compiler
   */
  public static setTypescriptCompiler(typescriptOverride: any): void {
    if (this._typescript) {
      throw new Error('The version of the typescript compiler should only be set once.');
    }

    if (this._baseTsConfig) {
      throw new Error('Set the version of the typescript compiler before tasks call getConfig()');
    }

    this._typescript = typescriptOverride;
  }

  /**
   * Get the version of the typescript compiler which is to be used
   */
  public static getTypescriptCompiler(): any {
    if (!this._typescript) {
      this._typescript = require('typescript');
    }
    return this._typescript;
  }

  /**
   * Helper function which reads the tsconfig.json (or provides one), and memoizes it
   */
  public static getTsConfigFile(config: IBuildConfig): ITsConfigFile<ts.Settings> {
    if (!this._baseTsConfig) {
      try {
        this._baseTsConfig = SchemaValidator.readCommentedJsonFile<any>(
          this._getConfigPath(config)
        );
      } catch (e) {
        /* no-op */
      }

      if (!this._baseTsConfig) {
        this._baseTsConfig = {
          compilerOptions: {
            declaration: true,
            experimentalDecorators: true,
            jsx: 'react',
            moduleResolution: 'node',
            sourceMap: true,
            target: 'es5',
            noUnusedParameters: true,
            noUnusedLocals: true
          }
        };
      }
    }
    return this._baseTsConfig;
  }

  /**
   * Extracts the path to the tsconfig.json based on the buildConfiguration
   */
  private static _getConfigPath(buildConfig: IBuildConfig): string {
    return path.resolve(path.join(buildConfig.rootPath, 'tsconfig.json'));
  }
}