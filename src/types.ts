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

import { Flitz, RequestErrorHandler } from "flitz";

export type HttpMethod = 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace';

export type SetupFlitzAppControllerAction = (context: SetupFlitzAppControllerActionContext) => Promise<any>;

export type SetupFlitzAppControllerMethodAction = (context: SetupFlitzAppControllerMethodActionContext) => Promise<any>;

export interface SetupFlitzAppControllerActionContext {
  app: Flitz;
  basePath: string;
  controller: any;
}

export interface SetupFlitzAppControllerMethodActionContext {
  app: Flitz;
  basePath: string;
  controller: any;
  method: Function;
  name: string;
  onError: RequestErrorHandler;
}

export enum ControllerObjectType {
  Controller = 'controller',
  Method = 'method',
}

export const CONTROLLER_OBJECT_TYPE = Symbol('CONTROLLER_OBJECT_TYPE');
export const ROUTE_SEP = '/';
export const SETUP_FLITZ_APP = Symbol('SETUP_FLITZ_APP');
