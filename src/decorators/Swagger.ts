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

import { OpenAPIV3 } from 'openapi-types';
import { SetupFlitzAppControllerSwaggerDocAction, SetupFlitzAppControllerSwaggerDocActionContext, SETUP_SWAGGER } from '../docs/swagger';
import { toSwaggerPath } from '../docs/utils';
import { ControllerMethodInfo, CONTROLLER_METHOD_INFO } from '../types';
import { isNil, sortObjectByKeys } from '../utils';
import { getActionList, getMethodOrThrow, isControllerMethodOrThrow } from './utils';

/**
 * Add a method of a controller to setup it up in a Swagger / Open API documentation.
 * 
 * @param {OpenAPIV3.OperationObject} [description] The description for the underlying path.
 * 
 * @returns {MethodDecorator} The new decorator function.
 */
export function Swagger(description: OpenAPIV3.OperationObject): MethodDecorator {
  if (typeof description !== 'object') {
    throw new TypeError('description must be object');
  }

  return function (target, methodName, descriptor) {
    const method = getMethodOrThrow(descriptor);

    getActionList<SetupFlitzAppControllerSwaggerDocAction>(method, SETUP_SWAGGER).push(
      async (context: SetupFlitzAppControllerSwaggerDocActionContext) => {
        isControllerMethodOrThrow(method);

        const info: ControllerMethodInfo = (method as any)[CONTROLLER_METHOD_INFO];
        if (['connect'].includes(info.method)) {
          throw new Error('Swagger does not support ' + info.method);
        }

        const swaggerPath = toSwaggerPath(info.routePath);

        let { paths } = context.document;

        if (!paths[swaggerPath]) {
          paths[swaggerPath] = {};

          paths = sortObjectByKeys(paths);  // sort by paths
        }

        if (!isNil((paths as any)[swaggerPath][info.method])) {
          throw new Error(`Swagger description already defined for [${info.method.toUpperCase()}] ${info.routePath}`);
        }

        (paths as any)[swaggerPath][info.method] = description;
        (paths as any)[swaggerPath] = sortObjectByKeys((paths as any)[swaggerPath]);  // sort by HTTP method

        context.document.paths = paths;
      }
    );
  };
}
