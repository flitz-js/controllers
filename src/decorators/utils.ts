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

const regexparam = require('regexparam');
import { CanBeNil, defaultErrorHandler, Flitz, Middleware, RequestErrorHandler, RequestHandler, RequestPath } from 'flitz';
import { ControllerRouteOptionsValue, ControllerRouteWithBodyOptions } from '.';
import { Request, Response, ResponseSerializer } from '..';
import { ControllerMethodInfo, ControllerObjectType, CONTROLLER_METHOD_INFO, CONTROLLER_OBJECT_TYPE, ERROR_HANDLER, HttpMethod, PARAM_PREFIX, REGISTRATED_HTTP_METHODS, SERIALIZER, SetupFlitzAppControllerMethodAction, SetupFlitzAppControllerMethodActionContext, SETUP_FLITZ_APP } from '../types';
import { asAsync, getParamList, isNil, isRequestPath, normalizePath, RegexParamResult } from '../utils';

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
  getResponseSerializer: () => CanBeNil<ResponseSerializer>;
  middlewares: Middleware[];
  name: HttpMethod;
  route: RequestPath;
}

interface WrapActionOptions {
  autoEnd: boolean;
  getErrorHandler: () => RequestErrorHandler;
  getRequestHandler: () => RequestHandler;
  getResponseSerializer: () => CanBeNil<ResponseSerializer>;
}

export function createHttpMethodDecorator(options: CreateHttpMethodDecoratorOptions): MethodDecorator {
  return function (target, methodName, descriptor) {
    const method = getMethodOrThrow(descriptor);

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
    const customSerializer = routeOptions?.serializer;
    const reqPath = routeOptions.path;

    if (!isNil(customOnError)) {
      if (typeof customOnError !== 'function') {
        throw new TypeError('options.decoratorOptions.onError must be function');
      }
    }

    if (!isNil(customSerializer)) {
      if (typeof customSerializer !== 'function') {
        throw new TypeError('options.decoratorOptions.serializer must be function');
      }
    }

    if (!isNil(reqPath)) {
      if (!isRequestPath(reqPath)) {
        throw new TypeError('options.decoratorOptions.path must be string, RegExp or function');
      }
    }

    getActionList<SetupFlitzAppControllerMethodAction>(method, SETUP_FLITZ_APP).push(
      async (context: SetupFlitzAppControllerMethodActionContext) => {
        setControllerObjectTypeOrThrow(method, ControllerObjectType.Method);

        const registratedHttpMethods = getValueList<HttpMethod>(method, REGISTRATED_HTTP_METHODS);
        if (!registratedHttpMethods.includes(options.name)) {
          registratedHttpMethods.push(options.name);
        }

        const routeName = String(methodName).trim();

        // relative path
        let relativePath: CanBeNil<string>;
        if (routeName && routeName !== 'index') {
          relativePath = routeName;
        }
        relativePath = normalizePath(relativePath);

        const fullPath = normalizePath(context.basePath + normalizePath(relativePath));
        let routePath = fullPath;

        // define route
        let route: RequestPath;
        if (isNil(reqPath)) {
          route = toRoute(fullPath);  // no custom path
        } else {
          if (typeof reqPath === 'function') {
            route = reqPath;  // custom validator
          } else if (reqPath instanceof RegExp) {
            route = () => reqPath.test(relativePath as string);  // custom regular expression
          } else {
            // custom, relative path

            const newFullPath = normalizePath(context.basePath + normalizePath(reqPath).split(':').join(PARAM_PREFIX));

            route = toRoute(newFullPath);  // no custom path
            routePath = newFullPath;
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

        const methodInfo: ControllerMethodInfo = {
          method: options.name,
          route,
          routePath
        };
        (method as any)[CONTROLLER_METHOD_INFO] = methodInfo;

        registerHttpMethod({
          app: context.app,
          autoEnd,
          controller: context.controller,
          getErrorHandler: () => {
            return asAsync<RequestErrorHandler>(
              (customOnError || context.controller[ERROR_HANDLER] || defaultErrorHandler)
                .bind(context.controller)
            );
          },
          getRequestHandler: () => {
            return asAsync<RequestHandler>(
              method.bind(context.controller)
            );
          },
          getResponseSerializer: () => {
            let serializer: CanBeNil<ResponseSerializer> = customSerializer || context.controller[SERIALIZER];
            if (serializer) {
              serializer = asAsync<ResponseSerializer>(
                serializer.bind(context.controller)
              );
            }

            return serializer;
          },
          middlewares,
          name: options.name,
          route
        });
      }
    );
  };
}

export function getActionList<T extends Function>(obj: any, key: PropertyKey): T[] {
  return getValueList<T>(obj, key);
}

export function getValueList<T>(obj: any, key: PropertyKey): T[] {
  let values: T[] = obj[key];
  if (!Array.isArray(values)) {
    obj[key] = values = [];
  }

  return values;
}

export function getMethodOrThrow<T extends Function = Function>(descriptor: PropertyDescriptor): T {
  const method: any = descriptor?.value;
  if (typeof method !== 'function') {
    throw new TypeError('descriptor.value must be function');
  }

  return method;
}

export function isControllerMethodOrThrow(method: any) {
  if (method[CONTROLLER_OBJECT_TYPE] !== ControllerObjectType.Method) {
    throw new Error('No controller method');
  }
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
      getRequestHandler: options.getRequestHandler,
      getResponseSerializer: options.getResponseSerializer
    }).bind(options.controller)
  );
}

export function setControllerObjectTypeOrThrow(obj: any, type: ControllerObjectType) {
  if (!isNil(obj?.[CONTROLLER_OBJECT_TYPE])) {
    throw new Error('Cannot reset controller object as ' + type);
  }

  obj[CONTROLLER_OBJECT_TYPE] = type;
}

function toRoute(fullPath: string): RequestPath {
  if (fullPath.includes(PARAM_PREFIX)) {
    const result: RegexParamResult = regexparam(
      fullPath.split(PARAM_PREFIX).join(':')
    );

    return (request: Request) => {
      const params = getParamList(request.url!, result);
      if (params) {
        request.params = params;
        return true;
      }

      return false;
    };
  }

  return fullPath;
}

function wrapAction({ autoEnd, getErrorHandler, getRequestHandler, getResponseSerializer }: WrapActionOptions): RequestHandler {
  const withSerializer = async (req: Request, resp: Response) => {
    let result = await getRequestHandler()(req, resp);

    const serializer = getResponseSerializer();

    if (serializer) {
      result = await serializer(result, req, resp);
    }

    return result;
  };

  if (autoEnd) {
    return async (request, response) => {
      try {
        const result = await withSerializer(request, response);

        response.end();

        return result;
      } catch (error) {
        await getErrorHandler()(error, request, response);
      }
    };
  }

  return async (request, response) => {
    try {
      return await withSerializer(request, response);;
    } catch (error) {
      await getErrorHandler()(error, request, response);
    }
  };
}
