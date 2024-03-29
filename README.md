# EasyApi
#### REST APIs for the Best of Us!

EasyApi makes building REST APIs in Meteor 0.9.0+ easier than ever before! The package is inspired
by [RestStop2][reststop2-docs] and [Collection API](https://github.com/crazytoad/meteor-collectionapi),
and is built on top of [Iron Router][iron-router]'s server-side routing to provide:
- A simple interface for creating REST APIs
- Easily setup CRUD endpoints for Mongo Collections
- User authentication via the API
  - Optional login and logout endpoints
  - Access to `this.user` in authenticated endpoints
  - Custom authentication if needed
- Role permissions for limiting access to specific endpoints
  - Works alongside the [`alanning:roles`][alanning-roles] package - Meteor's accepted role
    permission package
- And coming soon:
  - Basic versioning of routes and endpoints
  - JSON PATCH support on collections
  - Autogenerated OPTIONS endpoint on routes
  - Pre and post hooks on all endpoints

## Installation

You can install EasyApi using Meteor's package manager:
```bash
> meteor add sintret:easy-api
```
