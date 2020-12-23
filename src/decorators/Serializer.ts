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
import { SETUP_SERIALIZER, SERIALIZER, SetupFlitzAppControllerSerializerActionContext, SetupFlitzAppControllerSerializerAction, ControllerObjectType } from "../types";
import { getActionList, getMethodOrThrow, setControllerObjectTypeOrThrow } from "./utils";

/**
 * Options for @Serializer() decorator.
 */
export interface SerializerOptions {
}

/**
 * Add a method of a controller as a response serializer.
 * 
 * @param {CanBeNil<SerializerOptions>} [options] Custom options.
 * 
 * @returns {MethodDecorator} The new decorator function.
 */
export function Serializer(options?: CanBeNil<SerializerOptions>): MethodDecorator {
  if (isNil(options)) {
    options = {};
  }

  if (typeof options !== 'object') {
    throw new TypeError('options must be object');
  }

  return function (target, methodName, descriptor) {
    const method = getMethodOrThrow(descriptor);

    setControllerObjectTypeOrThrow(method, ControllerObjectType.Serializer);

    getActionList<SetupFlitzAppControllerSerializerAction>(method, SETUP_SERIALIZER).push(
      async (context: SetupFlitzAppControllerSerializerActionContext) => {
        context.controller[SERIALIZER] = method;
      }
    );
  };
}
