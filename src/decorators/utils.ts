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
import { CanBeNil, defaultErrorHandler, Flitz, Middleware, RequestErrorHandler, RequestHandler, RequestPath } from 'flitz';
import { ControllerRouteOptionsValue, ControllerRouteWithBodyOptions } from '.';
import { ControllerObjectType, CONTROLLER_OBJECT_TYPE, ERROR_HANDLER, HttpMethod, ROUTE_SEP, SetupFlitzAppControllerMethodAction, SetupFlitzAppControllerMethodActionContext, SETUP_FLITZ_APP } from '../types';
import { asAsync, isRequestPath } from '../utils';

interface CreateHttpMethodDecoratorOptions {
  decoratorOptions: CanBeNil<ControllerRouteOptionsValue<ControllerRouteWithBodyOptions>>;
  name: HttpMethod;
}

interface RegisterHttpMethodOptions {
  app: Flitz;
  autoEnd: boolean;
  controller: any;
  getErrorHandler: () => RequestErrorHandler;
  getRequestHandler: () => RequestHandler;
  middlewares: Middleware[];
  name: HttpMethod;
  route: RequestPath;
}

interface WrapActionOptions {
  autoEnd: boolean;
  getErrorHandler: () => RequestErrorHandler;
  getRequestHandler: () => RequestHandler;
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

    // options.decoratorOptions
    let routeOptions: CanBeNil<ControllerRouteWithBodyOptions>;
    {
      if (isRequestPath(options.decoratorOptions)) {
        routeOptions = {
          path: options.decoratorOptions
        };
      } else {
        routeOptions = options.decoratorOptions;
      }

      if (isNil(routeOptions)) {
        routeOptions = {};
      }

      if (typeof routeOptions !== 'object') {
        throw new TypeError('options.decoratorOptions must be string, RegExp, function or object');
      }
    }

    const autoEnd = isNil(routeOptions?.autoEnd) ? true : !!routeOptions!.autoEnd;
    const customOnError = routeOptions?.onError;
    const reqPath = routeOptions.path;

    if (!isNil(customOnError)) {
      if (typeof customOnError !== 'function') {
        throw new TypeError('options.decoratorOptions.onError must be function');
      }
    }

    if (!isNil(reqPath)) {
      if (!isRequestPath(reqPath)) {
        throw new TypeError('options.decoratorOptions.path must be string, RegExp or function');
      }
    }

    actions.push(
      async (context: SetupFlitzAppControllerMethodActionContext) => {
        const handler = asAsync<RequestHandler>(method.bind(context.controller));
        const routeName = String(methodName).trim();

        // relative path
        let relativePath = '';
        if (routeName && routeName !== 'index') {
          relativePath += routeName;
        }
        relativePath = normalizePath(relativePath);

        // define route
        let route: RequestPath;
        if (isNil(reqPath)) {
          route = normalizePath(context.basePath + normalizePath(relativePath));  // default, relative path
        } else {
          if (typeof reqPath === 'function') {
            route = reqPath;  // custom validator
          } else if (reqPath instanceof RegExp) {
            route = () => reqPath.test(relativePath);  // custom regular expression
          } else {
            route = normalizePath(context.basePath + normalizePath(reqPath));  // custom, relative path
          }
        }

        // middlewares
        const middlewares: Middleware[] = [];
        if (!isNil(routeOptions?.use)) {
          if (Array.isArray(routeOptions?.use)) {
            middlewares.push(...routeOptions?.use!);
          } else {
            middlewares.push(routeOptions?.use!);
          }
        }

        registerHttpMethod({
          app: context.app,
          autoEnd,
          controller: context.controller,
          getErrorHandler: () => {
            return (customOnError || context.controller[ERROR_HANDLER] || defaultErrorHandler).bind(context.controller);
          },
          getRequestHandler: () => handler,
          middlewares,
          name: options.name,
          route
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
      autoEnd: options.autoEnd,
      getErrorHandler: options.getErrorHandler,
      getRequestHandler: options.getRequestHandler
    }).bind(options.controller)
  );
}

function wrapAction({ autoEnd, getErrorHandler, getRequestHandler }: WrapActionOptions): RequestHandler {
  if (autoEnd) {
    return async (request, response) => {
      try {
        await getRequestHandler()(request, response);

        response.end();
      } catch (error) {
        await getErrorHandler()(error, request, response);
      }
    };
  }

  return async (request, response) => {
    try {
      await getRequestHandler()(request, response);
    } catch (error) {
      await getErrorHandler()(error, request, response);
    }
  };
}
