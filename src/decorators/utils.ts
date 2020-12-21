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

import path from 'path';
import { CanBeNil, Flitz, Middleware, RequestErrorHandler, RequestHandler, RequestPath } from 'flitz';
import { ControllerRouteWithBodyOptions } from '.';
import { ControllerObjectType, CONTROLLER_OBJECT_TYPE, HttpMethod, ROUTE_SEP, SetupFlitzAppControllerMethodAction, SetupFlitzAppControllerMethodActionContext, SETUP_FLITZ_APP } from '../types';
import { asAsync } from '../utils';

interface CreateHttpMethodDecoratorOptions {
  decoratorOptions: CanBeNil<ControllerRouteWithBodyOptions>;
  name: HttpMethod;
}

interface RegisterHttpMethodOptions {
  action: Function;
  app: Flitz;
  autoEnd: boolean;
  name: HttpMethod;
  middlewares: Middleware[];
  onError: RequestErrorHandler;
  route: RequestPath;
  thisArg?: any;
}

interface WrapActionOptions {
  action: Function;
  autoEnd: boolean;
  onError: RequestErrorHandler;
  thisArg: any;
}

export function createHttpMethodDecorator(options: CreateHttpMethodDecoratorOptions): MethodDecorator {
  return function (target, methodName, descriptor) {
    const method: any = descriptor?.value;
    if (typeof method !== 'function') {
      throw new TypeError('descriptor.value must be function');
    }

    method[CONTROLLER_OBJECT_TYPE] = ControllerObjectType.Method;

    let actions: SetupFlitzAppControllerMethodAction[] = method[SETUP_FLITZ_APP];
    if (!Array.isArray(actions)) {
      method[SETUP_FLITZ_APP] = actions = [];
    }

    const autoEnd = isNil(options.decoratorOptions?.autoEnd)
      ? true : !!options.decoratorOptions!.autoEnd;

    actions.push(
      async (context: SetupFlitzAppControllerMethodActionContext) => {
        let route: RequestPath = context.basePath;
        if (methodName && methodName !== 'index') {
          route = '/' + route;
        }

        registerHttpMethod({
          name: options.name,
          action: context.method,
          app: context.app,
          autoEnd,
          onError: context.onError,
          middlewares: [],
          route,
          thisArg: context.controller
        });
      }
    );
  };
}

export function isNil(val: CanBeNil<any>): val is (null | undefined) {
  return val === null || typeof val === 'undefined';
}

export function normalizePath(val: any): string {
  if (isNil(val)) {
    val = '';
  }

  val = String(val)
    .split(path.sep).join(ROUTE_SEP)
    .split(ROUTE_SEP).map(x => x.trim()).filter(x => x !== '').join(ROUTE_SEP)
    .trim();

  // remove leading /
  while (val.startsWith(ROUTE_SEP)) {
    val = val.substr(1).trim();
  }
  // remove ending /
  while (val.endsWith(ROUTE_SEP)) {
    val = val.substr(0, val.length - 1).trim();
  }

  return ROUTE_SEP + val;
}

export function registerHttpMethod(
  options: RegisterHttpMethodOptions
) {
  options.app[options.name](
    options.route,
    {
      use: options.middlewares
    },
    wrapAction({
      action: options.action,
      autoEnd: options.autoEnd,
      onError: options.onError,
      thisArg: options.thisArg
    }).bind(options.thisArg)
  );
}

function wrapAction({ action, autoEnd, onError, thisArg }: WrapActionOptions): RequestHandler {
  action = asAsync(action.bind(thisArg));

  if (autoEnd) {
    return async (request, response) => {
      try {
        await action(request, response);

        response.end();
      } catch (error) {
        await onError(error, request, response);
      }
    };
  }

  return async (request, response) => {
    try {
      await action(request, response);
    } catch (error) {
      await onError(error, request, response);
    }
  };
}
