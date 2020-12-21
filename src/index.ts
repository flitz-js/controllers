// Copyright 2020-present Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import fastGlob from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { CanBeNil, Flitz } from 'flitz';
import { CONTROLLER_OBJECT_TYPE, ControllerObjectType, SetupFlitzAppControllerAction, SETUP_FLITZ_APP } from './types';
import { normalizePath } from './decorators/utils';

/**
 * A possible value for 'initControllers()' function.
 */
export type FlitzAppOrInitOptions = Flitz | InitControllersOptions;

/**
 * Options for 'initControllers()' function.
 */
export interface InitControllersOptions {
  /**
   * The underlying application.
   */
  app: Flitz;
  /**
   * Glob patterns for module files, that include things like controller classes.
   * Default: *.js or *.ts
   */
  files?: string | string[];
  /**
   * The custom root directory. Default is '${cwd}/controllers'.
   */
  rootDir?: CanBeNil<string>;
}

const DEFAULT_FILE_FILTERS = ['**/*.js', '**/*.ts'];

const stat = fs.promises.stat;

/**
 * Initializes a Flitz instance using controllers.
 *
 * @param {FlitzAppOrInitOptions} optionsOrApp The options or a flitz app instance.
 */
export async function initControllers(optionsOrApp: FlitzAppOrInitOptions) {
  let options: CanBeNil<InitControllersOptions>;

  if (typeof optionsOrApp === 'function') {
    options = {
      app: optionsOrApp as Flitz
    };
  } else {
    options = optionsOrApp as InitControllersOptions;
  }

  if (options.app?.isFlitz !== true) {
    throw new TypeError('options.app does not seem to be a flitz instance');
  }

  const cwd = process.cwd();

  let rootDir = options.rootDir;
  if (!rootDir) {
    rootDir = path.join(cwd, 'controllers');
  }

  if (typeof rootDir !== 'string') {
    throw new TypeError('options.rootDir must be string');
  }

  if (!path.isAbsolute(rootDir)) {
    rootDir = path.join(cwd, rootDir);
  }

  const rootDirStat = await stat(rootDir);
  if (!rootDirStat.isDirectory()) {
    throw new TypeError('options.rootDir is no directory');
  }

  let files = options.files;
  if (!files) {
    files = [...DEFAULT_FILE_FILTERS];
  }
  if (!Array.isArray(files)) {
    files = [files];
  }
  if (!files.length) {
    files = [...DEFAULT_FILE_FILTERS];
  }

  if (!files.every(f => typeof f === 'string')) {
    throw new TypeError('Any item of options.files must be string');
  }

  const matchingFiles = await fastGlob(files, {
    absolute: true,
    cwd: rootDir,
    onlyFiles: true,
    unique: true
  });

  for (const moduleFile of matchingFiles) {
    const moduleDir = path.dirname(moduleFile);

    const controllerModule: any = require(require.resolve(moduleFile));
    for (const modulePropName in controllerModule) {
      const modulePropValue: any = controllerModule[modulePropName];
      if (typeof modulePropValue === 'function' && typeof modulePropValue.constructor === 'function') {
        if (modulePropValue[CONTROLLER_OBJECT_TYPE] === ControllerObjectType.Controller) {
          const controller = new modulePropValue();
          const setupControllerActions: SetupFlitzAppControllerAction[] = controller[SETUP_FLITZ_APP];

          let basePath = normalizePath(path.relative(rootDir, moduleDir));

          for (const setupAction of setupControllerActions) {
            await setupAction({
              app: options.app,
              basePath,
              controller
            });
          }
        }
      }
    }
  }
}

export * from './decorators';
