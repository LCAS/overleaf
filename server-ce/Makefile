# Makefile

OVERLEAF_BASE_TAG := registry.gitlab.fachschaften.org/tudo-fsinfo/admin/overleaf/base
OVERLEAF_TAG := registry.gitlab.fachschaften.org/tudo-fsinfo/admin/overleaf
OVERLEAF_BASE_CACHE := $(shell echo $(OVERLEAF_BASE_TAG) | sed -E 's/(.+):.+/\1:latest/')

export MONOREPO_REVISION := $(shell git rev-parse HEAD)
MONOREPO_ROOT := ../

all: build-base build-community

build-base:
	cp .dockerignore $(MONOREPO_ROOT)
ifeq ($(shell uname -m),x86_64)
	docker pull $(OVERLEAF_BASE_CACHE) || echo "nothing cached yet"
endif
	docker build -f Dockerfile-base --pull --cache-from $(OVERLEAF_BASE_CACHE) -t $(OVERLEAF_BASE_TAG) $(MONOREPO_ROOT)


build-community:
	cp .dockerignore $(MONOREPO_ROOT)
	docker build --build-arg OVERLEAF_BASE_TAG --build-arg MONOREPO_REVISION -f Dockerfile -t $(OVERLEAF_TAG) $(MONOREPO_ROOT)


.PHONY: all build-base build-community
