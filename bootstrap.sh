#!/bin/sh

# faster than a full git submodule init

curl -o angular.js.tar.gz -L https://github.com/angular/angular.js/archive/master.tar.gz
tar xf angular.js.tar.gz -C dev-vendor/
mv dev-vendor/angular.js-master dev-vendor/angular.js
