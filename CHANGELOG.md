# Changelog

All notable changes to this project will be documented in this file. 🤘

## [1.0.0-rc.6](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.6&targetRepoId=234) (2021-09-20)

### 🐛 Bug Fixes

- fix 500 error - EBSIINT-3312 ([77172b9](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/77172b90eda48e7738143f0ce02c84ea37615be9))
- fix 500 error invalid bearer token ([#41](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/41/overview)) - EBSIINT-3314 ([ef1922f](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/ef1922f91e63951c9f9337a19aef6c343c056e3e))
- update Node.js to v14.17.5 ([#37](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/37/overview)) - EBSIINT-3220 ([b06973e](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/b06973e9eb7e5482c96442eb16f396f3e9597f63))

## [1.0.0-rc.5](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.5&targetRepoId=234) (2021-08-04)

### 🐛 Bug Fixes

- missing try-catch decoding id_token ([#32](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/32/overview)) - EBSIINT-3204 ([af7c76f](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/af7c76f813f9702244edd33515514380dbda1add))
- upgrade Node.js to v14.17.4 ([#34](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/34/overview)) - EBSIINT-3206 ([76dc4a3](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/76dc4a3f8413110ce4565588930dba81ccd6c88e))

## [1.0.0-rc.4](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=234) (2021-07-27)

### 🐛 Bug Fixes

- authentication-responses url encoded body ([#28](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/28/overview)) - EBSIINT-3198 ([ad13341](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/ad1334144bbcaa191f0592cc26ce3dadbe2ab26d))
- update dependencies and upgrade Node.js to 14.17.2 ([#26](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/26/overview)) - EBSIINT-3174 ([56f8bda](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/56f8bda21b0b7deac3237f796e8d601e9e88ba0d))

## [1.0.0-rc.3](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.3&targetRepoId=234) (2021-06-17)

### 🚀 Features

- intercept Axios requests and redirect them to the local network ([#18](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/18/overview)) - EBSIINT-3039 ([75cd119](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/75cd119c25c06d5955b0e74bf0c062cb0c24fadc))

### 🐛 Bug Fixes

- add expiration to session token ([#19](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/19/overview)) - EBSIINT-3036 ([bfdb2d5](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/bfdb2d506a39dde3918c0da88f73ee0345bd940d))
- fix EU Login on testnet ([#16](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/16/overview)) - EBSIINT-3014 ([128fbad](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/128fbad775150b086967996307d17fd79e50b348))
- handle local API 404 response ([#20](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/20/overview)) - EBSIINT-3039 ([f64ccde](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/f64ccdeff8c8afad028321bca7caa835b87e6ade))
- handle missing JWT error better ([#17](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/17/overview)) - EBSIINT-3016 ([a7bf3cc](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/a7bf3ccf77ae76cb5c36a469a027ae111aca04ee))
- update VC library ([#22](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/22/overview)) - EBSIINT-3096 ([d7a4e58](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/d7a4e5820a1883bb68fbbf8dd985c40656a2f80b))

## [1.0.0-rc.2](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.2&targetRepoId=234) (2021-05-21)

### 🐛 Bug Fixes

- make user test vars optional ([#14](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/pull-requests/14/overview)) - EBSIINT-3012 ([3a9f7f2](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/commits/3a9f7f286c07c5dc1f7fd7b5a2f753498f319cb2))

## [1.0.0-rc.1](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=234) (2021-05-20)

## 1.0.0-rc.0 (2021-05-19)

Initial release.
