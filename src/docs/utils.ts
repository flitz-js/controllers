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
import { PARAM_PREFIX, ROUTE_SEP } from "../types";
import { isNil, normalizePath } from "../utils";

export function getDocsBasePath(basePath: CanBeNil<string>): string {
  if (isNil(basePath)) {
    basePath = '';
  }

  if (typeof basePath !== 'string') {
    throw new TypeError('basePath must be string');
  }

  basePath = basePath.trim();
  if (basePath === '') {
    return '/_docs';
  }

  return normalizePath(basePath);
}

export function toSwaggerPath(routePath: string): string {
  return normalizePath(
    normalizePath(routePath)
      .split(ROUTE_SEP)
      .map(x => x.trimStart().startsWith(PARAM_PREFIX) ? `{${x.substr(1)}}` : x)
      .join(ROUTE_SEP)
  );
}