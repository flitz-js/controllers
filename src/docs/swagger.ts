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

import fs from 'fs';
import mimeTypes from 'mime-types';
import path from 'path';
import { OpenAPIV3 } from "openapi-types";
import { DocumentationFormat, DocumentationOptions } from ".";
import { InitDocumentationOptions } from "./init";
import { getDocsBasePath } from "./utils";
import { CanBeNil, RequestPathValidator } from "flitz";
import { ROUTE_SEP } from "../types";
import { getAllClassProps, normalizePath } from "../utils";

export interface InitOpenApi3DocumentationOptions extends InitDocumentationOptions {
}

/**
 * Options for Open API 3 documentation.
 */
export interface OpenApi3Options extends DocumentationOptions {
  /**
   * The document.
   */
  document: OpenAPIV3.Document;
  /**
   * @inheritdoc
   */
  format?: DocumentationFormat.OpenApi3;
}

export type SetupFlitzAppControllerSwaggerDocAction = (context: SetupFlitzAppControllerSwaggerDocActionContext) => Promise<any>;

export interface SetupFlitzAppControllerSwaggerDocActionContext {
  controller: any;
  controllerClass: any;
  document: OpenAPIV3.Document;
  file: string;
}

export const SWAGGER = Symbol('SWAGGER');
export const SETUP_SWAGGER = Symbol('SETUP_SWAGGER');

const pathToSwaggerUi: string = path.resolve(
  require('swagger-ui-dist').absolutePath()
);
const { readFile, stat } = fs.promises;

function createPathValidator(basePath: CanBeNil<string>): RequestPathValidator {
  const prefix1 = getDocsBasePath(basePath);
  const prefix2 = prefix1 + (prefix1.endsWith(ROUTE_SEP) ? '' : ROUTE_SEP);

  return (request) => {
    return request.url === prefix1 ||
      !!request.url?.startsWith(prefix2);
  };
}

export async function initOpenApi3Documentation(
  options: InitDocumentationOptions<OpenApi3Options>
) {
  const { app, documentation } = options;

  const basePath = getDocsBasePath(documentation.basePath);
  const document: OpenAPIV3.Document = JSON.parse(
    JSON.stringify(options.documentation.document)
  );

  // run Swagger actions
  for (const controller of options.controllers) {
    const allPropNames = getAllClassProps(controller.class);

    const allMethods = allPropNames.map(propName => {
      return {
        property: propName,
        value: controller.class.prototype[propName]
      };
    }).filter(entry => typeof entry.value === 'function');

    // init swaggers
    const withSetupSwaggers = allMethods.filter(entry => {
      return Array.isArray(entry.value[SETUP_SWAGGER]);
    });
    for (const entry of withSetupSwaggers) {
      const setupSwaggerActions: SetupFlitzAppControllerSwaggerDocAction[] = entry.value[SETUP_SWAGGER];

      for (const setupAction of setupSwaggerActions) {
        await setupAction({
          controller: controller.instance,
          controllerClass: controller.class,
          document,
          file: controller.file
        });
      }
    }
  }

  // Swagger UI
  app.get(createPathValidator(documentation.basePath), async (request, response) => {
    try {
      let fileOrDir = normalizePath(request.url);
      let relativePath = normalizePath(path.relative(basePath, fileOrDir));

      let fullPath = path.join(pathToSwaggerUi, relativePath);
      if (
        fullPath.startsWith(pathToSwaggerUi + path.sep) ||
        fullPath === pathToSwaggerUi
      ) {
        let existingFile: string | false = false;

        if (fs.existsSync(fullPath)) {
          const fileOrDirStats = await stat(fullPath);
          if (fileOrDirStats.isDirectory()) {
            fullPath = path.join(fullPath, 'index.html');
            if (fs.existsSync(fullPath)) {
              existingFile = fullPath;
            }
          } else {
            existingFile = fullPath;
          }
        }

        if (existingFile) {
          existingFile = path.resolve(existingFile);
          const contentType = mimeTypes.contentType(path.basename(existingFile)) || 'application/octet-stream';

          response.writeHead(200, {
            'Content-Type': contentType
          });
          response.write(await readFile(existingFile));

          return;
        }
      }

      response.writeHead(404);
    } catch (e) {
      if (!response.headersSent) {
        response.writeHead(500);
      }

      response.write('' + e);
    } finally {
      response.end();
    }
  });
}
