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

import { defaultErrorHandler } from 'flitz';
import { CONTROLLER_OBJECT_TYPE, ControllerObjectType, SetupFlitzAppControllerActionContext, SetupFlitzAppControllerMethodAction, SETUP_FLITZ_APP, SetupFlitzAppControllerAction } from "../types";

/**
 * Marks a class as controller.
 */
export function Controller() {
  return function (classFunction: any) {
    if (typeof classFunction !== 'function') {
      throw new TypeError('classFunction must be function');
    }
    if (typeof classFunction.constructor !== 'function') {
      throw new TypeError('classFunction must be class');
    }

    classFunction[CONTROLLER_OBJECT_TYPE] = ControllerObjectType.Controller;

    let actions: SetupFlitzAppControllerAction[] = classFunction.prototype[SETUP_FLITZ_APP];
    if (!Array.isArray(actions)) {
      classFunction.prototype[SETUP_FLITZ_APP] = actions = [];
    }

    actions.push(
      async (context: SetupFlitzAppControllerActionContext) => {
        let onError = defaultErrorHandler;

        const allPropNames = Object.getOwnPropertyNames(classFunction.prototype);

        const allMethods = allPropNames.map(propName => {
          return {
            property: propName,
            value: classFunction.prototype[propName]
          };
        }).filter(entry => typeof entry.value === 'function');

        const controllerMethods = allMethods.filter(entry => {
          return Array.isArray(entry.value[SETUP_FLITZ_APP]);
        });

        for (const entry of controllerMethods) {
          const setupMethodActions: SetupFlitzAppControllerMethodAction[] = entry.value[SETUP_FLITZ_APP];

          for (const setupAction of setupMethodActions) {
            await setupAction({
              app: context.app,
              basePath: context.basePath,
              controller: context.controller,
              method: entry.value,
              name: entry.property,
              onError
            });
          }
        }
      }
    );
  }
}
