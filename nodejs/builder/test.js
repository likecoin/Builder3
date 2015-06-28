var assert = require('assert');
var builder = require('./builder');
var parse = builder.parse;


describe('parser', function(){
  it('parse square tag', function () {

    var result = parse('[tag]')

    assert.deepEqual(result, {
      scripts: [{
        args: {},
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse square tag attribute', function () {
    var result = parse('[tag attr1=value1 attr2=value2]')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse square tag quoted attribute', function () {
    var result = parse('[tag attr1="value1" attr2="value2"]')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse new line in tag', function () {
    var result = parse('[tag \n attr1="value1" \n attr2="value2"]')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse callback args', function () {
    var result = parse('[tag attr1="value1" (var1)->][/tag]')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1'
        },
        callbackArgs: ['var1'],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: true,
        lineNumber: 1,
        name: 'tag'
      },
      {
        args: {},
        callbackArgs: [],
        charNumber: 31,
        isClose: true,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse at tag', function () {

    var result = parse('@tag')

    assert.deepEqual(result, {
      scripts: [{
        args: {},
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse at tag attribute', function () {
    var result = parse('@tag attr1=value1 attr2=value2')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse at tag quoted attribute', function () {
    var result = parse('@tag attr1="value1" attr2="value2"')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse at tag quoted attribute, escaped', function () {
    var result = parse('@tag attr1="value1" attr2="`"value2`""')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1',
          attr2: '"value2"'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      }],
      warnings: []
    });
  });

  it('parse multiple tags', function () {
    var result = parse('[tag attr1="value1"][tag2 attr2="value2"]\n@tag3')

    assert.deepEqual(result, {
      scripts: [{
        args: {
          attr1: 'value1'
        },
        callbackArgs: [],
        charNumber: 2,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag'
      },
      {
        args: {
          attr2: 'value2'
        },
        callbackArgs: [],
        charNumber: 22,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 1,
        name: 'tag2'
      },
      {
        args: {},
        callbackArgs: [],
        charNumber: 1,
        isClose: false,
        isDependency: false,
        isOpen: false,
        lineNumber: 2,
        name: 'tag3'
      }],
      warnings: []
    });
  });
});