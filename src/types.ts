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

import { Flitz } from "flitz";

export type HttpMethod = 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace';

export interface LoadedController {
  'class': any;
  file: string;
  instance: any;
}

export type SetupFlitzAppControllerAction = (context: SetupFlitzAppControllerActionContext) => Promise<any>;

export type SetupFlitzAppControllerErrorHandlerAction = (context: SetupFlitzAppControllerErrorHandlerActionContext) => Promise<any>;

export type SetupFlitzAppControllerMethodAction = (context: SetupFlitzAppControllerMethodActionContext) => Promise<any>;

export type SetupFlitzAppControllerSerializerAction = (context: SetupFlitzAppControllerSerializerActionContext) => Promise<any>;

export interface SetupFlitzAppControllerActionContext {
  app: Flitz;
  basePath: string;
  controller: any;
  controllerClass: any;
  file: string;
}

export interface SetupFlitzAppControllerErrorHandlerActionContext {
  app: Flitz;
  controller: any;
  controllerClass: any;
  file: string;
  method: Function;
}

export interface SetupFlitzAppControllerMethodActionContext {
  app: Flitz;
  basePath: string;
  controller: any;
  file: string;
  method: Function;
  name: string;
}

export interface SetupFlitzAppControllerSerializerActionContext {
  app: Flitz;
  basePath: string;
  controller: any;
  file: string;
  method: Function;
  name: string;
}

export enum ControllerObjectType {
  Controller = 'controller',
  Method = 'method',
}

export const CONTROLLER_OBJECT_TYPE = Symbol('CONTROLLER_OBJECT_TYPE');
export const ERROR_HANDLER = Symbol('ERROR_HANDLER');
export const REGISTRATED_HTTP_METHODS = Symbol('REGISTRATED_HTTP_METHODS');
export const ROUTE_SEP = '/';
export const SERIALIZER = Symbol('SERIALIZER');
export const SETUP_FLITZ_APP = Symbol('SETUP_FLITZ_APP');
export const SETUP_ERROR_HANDLER = Symbol('SETUP_ERROR_HANDLER');
export const SETUP_SERIALIZER = Symbol('SETUP_SERIALIZER');
