
.PHONY: build-RuntimeDependenciesLayer build-lambda-common
.PHONY: build-AuthAtEdge

build-AuthAtEdge:
	$(MAKE) HANDLER=src/edge/auth.ts build-lambda-edge

build-ApiFunction:
	$(MAKE) HANDLER=src/edge/auth.ts build-lambda-common

build-lambda-edge:
	rm -rf dist
	yarn --production --modules-folder dist/edge/node_modules
	echo "{\"extends\": \"./tsconfig.json\", \"include\": [\"${HANDLER}\"] }" > tsconfig-only-handler.json
	yarn build --build tsconfig-only-handler.json
	cp package.json yarn.lock "dist/edge"
	cp -r dist "$(ARTIFACTS_DIR)/"

build-lambda-common:
	yarn
	rm -rf dist
	echo "{\"extends\": \"./tsconfig.json\", \"include\": [\"${HANDLER}\"] }" > tsconfig-only-handler.json
	yarn build --build tsconfig-only-handler.json
	cp -r dist "$(ARTIFACTS_DIR)/"

# build-RuntimeDependenciesLayer:
# 	mkdir -p "$(ARTIFACTS_DIR)/nodejs"
# 	cp package.json yarn.lock "$(ARTIFACTS_DIR)/nodejs/"
# 	yarn --production --cwd "$(ARTIFACTS_DIR)/nodejs/"
# 	rm "$(ARTIFACTS_DIR)/nodejs/package.json" # to avoid rebuilding when changes doesn't relate to dependencies