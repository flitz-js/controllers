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

import { CanBeNil } from "flitz";
import { ControllerObjectType, SetupFlitzAppControllerErrorHandlerAction, SetupFlitzAppControllerActionContext, SetupFlitzAppControllerMethodAction, SetupFlitzAppControllerSerializerAction, SETUP_ERROR_HANDLER, SETUP_FLITZ_APP, SetupFlitzAppControllerAction, SETUP_SERIALIZER, SETUP_VALUE_IMPORT, SetupFlitzAppControllerValueImportAction } from "../types";
import { getAllClassProps, isClass } from "../utils";
import { getActionList, setControllerObjectTypeOrThrow } from "./utils";

/**
 * Marks a class as controller.
 * 
 * @returns {ClassDecorator} The class decorator.
 */
export function Controller(): ClassDecorator {
  return function (classFunction: Function) {
    if (!isClass(classFunction)) {
      throw new TypeError('classFunction must be class');
    }

    setControllerObjectTypeOrThrow(classFunction.prototype, ControllerObjectType.Controller);

    getActionList<SetupFlitzAppControllerAction>(classFunction.prototype, SETUP_FLITZ_APP).push(
      async (context: SetupFlitzAppControllerActionContext) => {
        const allPropNames = getAllClassProps(classFunction);

        const allMethods = allPropNames.map(propName => {
          return {
            property: propName,
            value: classFunction.prototype[propName]
          };
        }).filter(entry => typeof entry.value === 'function');

        const controllerMethods = allMethods.filter(entry => {
          return Array.isArray(entry.value[SETUP_FLITZ_APP]) &&
            !entry.value[SETUP_ERROR_HANDLER]?.length &&
            !entry.value[SETUP_SERIALIZER]?.length;
        });

        // controllers
        for (const entry of controllerMethods) {
          const setupMethodActions: SetupFlitzAppControllerMethodAction[] = entry.value[SETUP_FLITZ_APP];

          for (const setupAction of setupMethodActions) {
            await setupAction({
              app: context.app,
              basePath: context.basePath,
              controller: context.controller,
              file: context.file,
              method: entry.value,
              name: entry.property
            });
          }
        }

        // controller wide error handler?
        const withSetupErrorHandlers = allMethods.filter(entry => {
          return Array.isArray(entry.value[SETUP_ERROR_HANDLER]);
        });
        for (const entry of withSetupErrorHandlers) {
          const setupErrorHandlerActions: SetupFlitzAppControllerErrorHandlerAction[] = entry.value[SETUP_ERROR_HANDLER];

          for (const setupAction of setupErrorHandlerActions) {
            await setupAction({
              app: context.app,
              controller: context.controller,
              controllerClass: context.controllerClass,
              file: context.file,
              method: entry.value
            });
          }
        }

        // controller wide serializer
        const withSetupSerilizers = allMethods.filter(entry => {
          return Array.isArray(entry.value[SETUP_SERIALIZER]);
        });
        for (const entry of withSetupSerilizers) {
          const setupSerilizerActions: SetupFlitzAppControllerSerializerAction[] = entry.value[SETUP_SERIALIZER];

          for (const setupAction of setupSerilizerActions) {
            await setupAction({
              app: context.app,
              basePath: context.basePath,
              controller: context.controller,
              file: context.file,
              method: entry.value,
              name: entry.property
            });
          }
        }

        // value imports
        {
          const setupValueImportActions: CanBeNil<SetupFlitzAppControllerValueImportAction[]> = context.controller[SETUP_VALUE_IMPORT];
          if (setupValueImportActions) {
            for (const setupAction of setupValueImportActions) {
              await setupAction({
                app: context.app,
                controller: context.controller,
                controllerClass: context.controllerClass,
                file: context.file,
                values: context.values
              });
            }
          }
        }
      }
    );
  }
}
