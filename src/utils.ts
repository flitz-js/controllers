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

import util from 'util';

export function asAsync<T extends Function = ((...args: any[]) => Promise<any>)>(action: Function): T {
  if (util.types.isAsyncFunction(action)) {
    return action as T;
  }

  return (async (...args: any[]) => {
    return action(...args);
  }) as any;
}

export function compareValues<T>(x: T, y: T): number {
  return compareValuesBy(x, y, item => item);
}

export function compareValuesBy<T1, T2>(x: T1, y: T1, selector: (item: T1) => T2): number {
  const valX = selector(x);
  const valY = selector(y);

  if (valX !== valY) {
    if (valX < valY) {
      return -1;
    }

    return 1;  // valX > valY
  }

  return 0;
}
