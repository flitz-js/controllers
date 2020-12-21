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

import { CanBeNil, Middleware, Request as FlitzRequest, RequestErrorHandler, RequestPath, Response as FlitzResponse } from 'flitz';

/**
 * Options for a controller route without a body.
 */
export interface ControllerRouteOptions {
  /**
   * Indicates if route method should call 'end()' method
   * of a request context automatically or not.
   * 
   * Default: (true)
   */
  autoEnd?: CanBeNil<boolean>;
  /**
   * The custom error handler.
   */
  onError?: CanBeNil<RequestErrorHandler>;
  /**
   * The custom path.
   */
  path?: CanBeNil<RequestPath>;
  /**
   * One or more custom middlewares.
   */
  use?: CanBeNil<Middleware | Middleware[]>;
}

/**
 * Options for a controller route with a body.
 */
export interface ControllerRouteWithBodyOptions extends ControllerRouteOptions {
}

/**
 * Options for a controller route decorator.
 */
export type ControllerRouteOptionsValue<TOptions extends ControllerRouteOptions = ControllerRouteOptions>
  = RequestPath | TOptions;

/**
 * An extended request context.
 */
export interface Request extends FlitzRequest {
}

/**
 * An extended response context.
 */
export interface Response extends FlitzResponse {
}

export * from './CONNECT';
export * from './Controller';
export * from './DELETE';
export * from './ErrorHandler';
export * from './GET';
export * from './HEAD';
export * from './OPTIONS';
export * from './PATCH';
export * from './POST';
export * from './PUT';
export * from './TRACE';
