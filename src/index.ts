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
import { CanBeNil, Flitz, Request as FlitzRequest, Response as FlitzResponse } from 'flitz';
import { CONTROLLER_OBJECT_TYPE, ControllerObjectType, SetupFlitzAppControllerAction, SETUP_FLITZ_APP, LoadedController } from './types';
import { normalizePath } from './utils';
import { compareValues, compareValuesBy } from './utils';
import { DocumentationOptions } from './docs';
import { initDocumentation } from './docs/init';

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
   * Options for a generated API documentation.
   */
  documentation?: CanBeNil<DocumentationOptions>;
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

/**
 * An extended request context.
 */
export interface Request extends FlitzRequest {
}

/**
 * An extended response context.
 */
export interface Response extends FlitzResponse {
}

/**
 * Describes an action, that returns the result of a request handler, in serialized form.
 * 
 * @param {any} result The result data of the action.
 * @param {Request} request The request context.
 * @param {Response} response The request context.
 */
export type ResponseSerializer = (result: any, request: Request, response: Response) => Promise<any>;

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

  const matchingFiles = (await fastGlob(files, {
    absolute: true,
    cwd: rootDir,
    onlyFiles: true,
    unique: true
  })).filter(fullFilePath => {
    // skip files with leading _
    return !path.basename(fullFilePath).trim().startsWith('_');
  }).sort((x, y) => {
    // first by directory
    const COMP_0 = compareValuesBy(x, y, fullFilePath => {
      return path.dirname(fullFilePath).toLowerCase().trim();
    });
    if (COMP_0 !== 0) {
      return COMP_0;
    }

    // files called 'index' will be loaded
    // before all other ones
    const COMP_1 = compareValuesBy(x, y, fullFilePath => {
      const nameOfFileOnly = path.basename(
        fullFilePath,
        path.extname(fullFilePath)
      ).trim();

      return 'index' !== nameOfFileOnly ? 1 : 0;
    });
    if (COMP_1 !== 0) {
      return COMP_1;
    }

    // then by name
    const COMP_2 = compareValuesBy(x, y, fullFilePath => {
      return path.basename(fullFilePath).toLowerCase().trim();
    });
    if (COMP_2 !== 0) {
      return COMP_2;
    }

    // now by full name
    return compareValues(
      x.toLowerCase().trim(),
      y.toLowerCase().trim()
    );
  });

  const loadedControllers: LoadedController[] = [];

  for (const file of matchingFiles) {
    const moduleFile = require.resolve(file);
    const moduleDir = path.dirname(file);

    const controllerModule: any = require(moduleFile);
    for (const modulePropName in controllerModule) {
      const maybeClass: any = controllerModule[modulePropName];
      if (typeof maybeClass === 'function' && typeof maybeClass.constructor === 'function') {
        if (maybeClass.prototype?.[CONTROLLER_OBJECT_TYPE] === ControllerObjectType.Controller) {
          const controller: any = new maybeClass();
          const setupControllerActions: SetupFlitzAppControllerAction[] = controller[SETUP_FLITZ_APP];

          const basePath = normalizePath(
            path.relative(rootDir, moduleDir)
          );

          for (const setupAction of setupControllerActions) {
            await setupAction({
              app: options.app,
              basePath,
              controller,
              controllerClass: maybeClass,
              file
            });
          }

          loadedControllers.push({
            class: maybeClass,
            file: file,
            instance: controller
          });
        }
      }
    }
  }

  if (options.documentation) {
    await initDocumentation({
      app: options.app,
      controllers: loadedControllers,
      documentation: options.documentation
    });
  }
}

export * from './decorators';
export * from './docs';
