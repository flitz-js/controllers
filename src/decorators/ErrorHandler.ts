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
import { isNil } from "../utils";
import { ERROR_HANDLER, SETUP_ERROR_HANDLER, SetupFlitzAppControllerErrorHandlerAction, SetupFlitzAppControllerErrorHandlerActionContext } from "../types";
import { getActionList, getMethodOrThrow } from "./utils";

/**
 * Options for @ErrorHandler() decorator.
 */
export interface ErrorHandlerOptions {
  /**
   * Indicates if error handler should call 'end()' method
   * of a request context automatically or not.
   * 
   * Default: (true)
   */
  autoEnd?: CanBeNil<boolean>;
}

/**
 * Add a method of a controller as an error handler.
 * 
 * @param {CanBeNil<ErrorHandlerOptions>} [options] Custom options.
 * 
 * @returns {MethodDecorator} The new decorator function.
 */
export function ErrorHandler(options?: CanBeNil<ErrorHandlerOptions>): MethodDecorator {
  if (isNil(options)) {
    options = {};
  }

  if (typeof options !== 'object') {
    throw new TypeError('options must be object');
  }

  return function (target, methodName, descriptor) {
    const method = getMethodOrThrow(descriptor);

    getActionList<SetupFlitzAppControllerErrorHandlerAction>(method, SETUP_ERROR_HANDLER).push(
      async (context: SetupFlitzAppControllerErrorHandlerActionContext) => {
        context.controller[ERROR_HANDLER] = method;
      }
    );
  };
}
