# Integration tests

In order to run the tests, you need to build the Core Services docker images. From the root folder, run:

```sh
GIT_COMMIT=123 yarn docker-build:all --progress=plain --parallel=1
```

You can replace `GIT_COMMIT=123` with any value you want, just make sure to reuse the same value later.

Next, in the `tests` folder, run:

```sh
GIT_COMMIT=123 docker compose up --build
```
