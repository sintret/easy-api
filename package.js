Package.describe({
  name: 'sintret:easy-api',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  //package files
  api.addFiles('lib/easyapi.js', 'server');
  api.addFiles('lib/route.js', 'server');
  api.addFiles('lib/auth.js', 'server');

});

Package.onTest(function(api) {
  api.use('tinytest');

  api.use('http');
  api.use('peterellisjones:describe');
  api.use('accounts-base');
  api.use('accounts-password');

  api.addFiles('test/route_tests.js', 'server');
  api.addFiles('test/api_tests.js', 'server');
  api.addFiles('test/authentication_tests.js', 'server');
});
