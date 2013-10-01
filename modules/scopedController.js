/*global angular*/
'use strict';

angular.module('ngvs.sc')
.factory('ScopedController', function ($rootScope, $interpolate, $parse) {

    function ScopedController() {
        $rootScope.constructor.apply(this, arguments);
    }
    angular.extend(ScopedController.prototype, $rootScope.constructor.prototype);
    ScopedController.prototype.constructor = ScopedController;
    delete ScopedController.prototype.$new;
    ScopedController.prototype.$init = function(parent) {
        var child = this;
        // TODO: make sure uglifyjs optimizes this variable away
        var isolate = true;
        //#include
        //#from "../dev-vendor/angular.js/src/ng/rootScope.js"
        //#id $RootScopeProvider->this.$get[-1]->Scope.prototype.$new
        //#replace "this" with "parent"
        //#remove "child = new Scope();"
        child.$root = parent.$root;
        // ensure that there is just one async queue per $rootScope and its children
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child['this'] = child;
        child.$$listeners = {};
        child.$parent = parent;
        child.$$watchers = child.$$nextSibling = child.$$childHead = child.$$childTail = null;
        child.$$prevSibling = parent.$$childTail;
        if (parent.$$childHead) {
          parent.$$childTail.$$nextSibling = child;
          parent.$$childTail = child;
        } else {
          parent.$$childHead = parent.$$childTail = child;
        }
        //#endinclude
        return this;
    };

    var $compileMinErr = angular.$$minErr('$compile');
    ScopedController.prototype.$bindIsolate = function(bindings, attrs) {
      var newIsolateScopeDirective = {
        scope: bindings
      };
      var scope = this;

      // from compile.js TODO: create a AST walker to automatically extract this
      //#include
      //#from "../dev-vendor/angular.js/src/ng/compile.js"
      //#id $CompileProvider->this.$get[-1]->applyDirectivesToNode->nodeLinkFn@if(newIsolateScopeDirective)
      //#replace "forEach" with "angular.forEach"
      //#remove "child = new Scope();"
      var LOCAL_REGEXP = /^\s*([@=&])(\??)\s*(\w*)\s*$/;

      var parentScope = scope.$parent || scope;

      angular.forEach(newIsolateScopeDirective.scope, function(definition, scopeName) {
        var match = definition.match(LOCAL_REGEXP) || [],
            attrName = match[3] || scopeName,
            optional = (match[2] == '?'),
            mode = match[1], // @, =, or &
            lastValue,
            parentGet, parentSet;

        scope.$$isolateBindings[scopeName] = mode + attrName;

        switch (mode) {

          case '@': {
            attrs.$observe(attrName, function(value) {
              scope[scopeName] = value;
            });
            attrs.$$observers[attrName].$$scope = parentScope;
            if( attrs[attrName] ) {
              // If the attribute has been provided then we trigger an interpolation to ensure the value is there for use in the link fn
              scope[scopeName] = $interpolate(attrs[attrName])(parentScope);
            }
            break;
          }

          case '=': {
            if (optional && !attrs[attrName]) {
              return;
            }
            parentGet = $parse(attrs[attrName]);
            parentSet = parentGet.assign || function() {
              // reset the change, or we will throw this exception on every $digest
              lastValue = scope[scopeName] = parentGet(parentScope);
              throw $compileMinErr('nonassign', "Expression '{0}' used with directive '{1}' is non-assignable!",
                  attrs[attrName], newIsolateScopeDirective.name);
            };
            lastValue = scope[scopeName] = parentGet(parentScope);
            scope.$watch(function parentValueWatch() {
              var parentValue = parentGet(parentScope);

              if (parentValue !== scope[scopeName]) {
                // we are out of sync and need to copy
                if (parentValue !== lastValue) {
                  // parent changed and it has precedence
                  lastValue = scope[scopeName] = parentValue;
                } else {
                  // if the parent can be assigned then do so
                  parentSet(parentScope, parentValue = lastValue = scope[scopeName]);
                }
              }
              return parentValue;
            });
            break;
          }

          case '&': {
            parentGet = $parse(attrs[attrName]);
            scope[scopeName] = function(locals) {
              return parentGet(parentScope, locals);
            };
            break;
          }
          
          // TODO: add a '->' for easier callback mapping

          default: {
            throw $compileMinErr('iscp', "Invalid isolate scope definition for directive '{0}'. Definition: {... {1}: '{2}' ...}",
                newIsolateScopeDirective.name, scopeName, definition);
          }
        }
      });
      //#endinclude
      return this;
    };

    return ScopedController;
});
