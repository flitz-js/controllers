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
import indexHtml from './resources/index_html';
import mimeTypes from 'mime-types';
import path from 'path';
import toml from '@iarna/toml';
import yaml from 'js-yaml';
import { OpenAPIV3 } from "openapi-types";
import { DocumentationFormat, DocumentationOptions } from "..";
import { InitDocumentationOptions } from "../init";
import { getDocsBasePath } from "../utils";
import { CanBeNil, RequestPathValidator } from "flitz";
import { ROUTE_SEP } from "../../types";
import { getAllClassProps, normalizePath } from "../../utils";

export interface InitOpenApi3DocumentationOptions extends InitDocumentationOptions {
}

/**
 * Options for Open API 3 documentation.
 */
export interface OpenApi3Options extends DocumentationOptions {
  /**
   * The document.
   * 
   * @see https://swagger.io/docs/specification/basic-structure/
   */
  document: {
    components?: OpenAPIV3.ComponentsObject;
    externalDocs?: OpenAPIV3.ExternalDocumentationObject;
    info?: OpenAPIV3.InfoObject;
    security?: OpenAPIV3.SecurityRequirementObject[];
    servers?: OpenAPIV3.ServerObject[];
    tags?: OpenAPIV3.TagObject[];
  };
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
const indexHtmlFilePath = path.join(pathToSwaggerUi, 'index.html');
const { readFile, stat } = fs.promises;

function createPathValidator(basePath: CanBeNil<string>): RequestPathValidator {
  basePath = getDocsBasePath(basePath);
  const basePathWithSuffix = basePath + (basePath.endsWith(ROUTE_SEP) ? '' : ROUTE_SEP);

  return (request) => {
    return request.url === basePath ||
      !!request.url?.startsWith(basePathWithSuffix);
  };
}

export async function initOpenApi3Documentation(
  options: InitDocumentationOptions<OpenApi3Options>
) {
  const { app, documentation } = options;

  const basePath = getDocsBasePath(documentation.basePath);
  const basePathWithSuffix = basePath + (basePath.endsWith(ROUTE_SEP) ? '' : ROUTE_SEP);

  const document: OpenAPIV3.Document = JSON.parse(
    JSON.stringify(options.documentation.document)
  );
  document.openapi = '3.0.0';
  document.paths = {};

  const indexHtmlContent = Buffer.from(await indexHtml(), 'utf8');

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

  const documentJson = Buffer.from(JSON.stringify(document), 'utf8');
  const documentToml = Buffer.from(toml.stringify(document as any), 'utf8');
  const documentYaml = Buffer.from(yaml.safeDump(document), 'utf8');

  // Swagger UI
  app.get(createPathValidator(documentation.basePath), async (request, response) => {
    try {
      if (request.url === basePath) {
        response.writeHead(301, {
          Location: basePathWithSuffix
        });

        return;
      }

      let fileOrDir = normalizePath(request.url);
      let relativePath = normalizePath(path.relative(basePath, fileOrDir));

      // return as JSON
      if (['/json', '/json/'].includes(relativePath)) {
        response.writeHead(200, {
          'Content-Disposition': `attachment; filename="api-openapi3.json`,
          'Content-Type': 'application/json; charset=utf-8'
        });
        response.write(documentJson);

        return;
      }

      // return as YAML
      if (['/yaml', '/yaml/'].includes(relativePath)) {
        response.writeHead(200, {
          'Content-Disposition': `attachment; filename="api-openapi3.yaml`,
          'Content-Type': 'application/x-yaml; charset=utf-8'
        });
        response.write(documentYaml);

        return;
      }

      // return as TOML
      if (['/toml', '/toml/'].includes(relativePath)) {
        response.writeHead(200, {
          'Content-Disposition': `attachment; filename="api-openapi3.toml`,
          'Content-Type': 'application/toml; charset=utf-8'
        });
        response.write(documentToml);

        return;
      }

      let fullPath = path.join(pathToSwaggerUi, relativePath);
      if (
        fullPath.startsWith(pathToSwaggerUi + path.sep) ||
        fullPath === pathToSwaggerUi
      ) {
        let existingFile: string | false = false;

        if (fs.existsSync(fullPath)) {
          const fileOrDirStats = await stat(fullPath);
          if (fileOrDirStats.isDirectory()) {
            fullPath = indexHtmlFilePath;

            if (fs.existsSync(fullPath)) {
              existingFile = fullPath;
            }
          } else {
            existingFile = fullPath;
          }
        }

        if (fullPath === indexHtmlFilePath) {  // index.html
          response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
          });
          response.write(indexHtmlContent);

          return;
        }

        if (existingFile) {  // does file exist?
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
