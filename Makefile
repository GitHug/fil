
.PHONY: build-RuntimeDependenciesLayer build-lambda-common
.PHONY: build-AuthAtEdge
.PHONY: build-UploadFunction build-UserConfirmFunction build-UploadTriggerFunction build-CreateUserFunction
.PHONY: build CustomResourceHandler build-DBMigrationHandler

build-AuthAtEdge:
	$(MAKE) HANDLER=src/edge/auth.ts build-lambda-edge

build-UploadFunction:
	$(MAKE) HANDLER=src/handlers/upload.ts build-lambda-common

build-UserConfirmFunction:
	$(MAKE) HANDLER=src/handlers/userConfirm.ts build-lambda-common

build-UploadTriggerFunction:
	$(MAKE) HANDLER=src/handlers/uploadTrigger.ts build-lambda-common

build-CreateUserFunction:
	$(MAKE) HANDLER=src/handlers/createUser.ts build-lambda-common

build-CustomResourceHandler:
	$(MAKE) HANDLER=src/handlers/customResource.ts build-custom-resource

build-DBMigrationHandler:
	$(MAKE) HANDLER=src/handlers/dbMigration.ts build-custom-resource

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

build-custom-resource:
	rm -rf dist
	echo "{\"extends\": \"./tsconfig.json\", \"include\": [\"${HANDLER}\"] }" > tsconfig-only-handler.json
	yarn build --build tsconfig-only-handler.json
	cp package.json yarn.lock "$(ARTIFACTS_DIR)/"
	yarn --production --cwd "$(ARTIFACTS_DIR)/"
	cp -r dist "$(ARTIFACTS_DIR)/"

build-RuntimeDependenciesLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs"
	cp package.json yarn.lock "$(ARTIFACTS_DIR)/nodejs/"
	yarn --production --cwd "$(ARTIFACTS_DIR)/nodejs/"
	rm "$(ARTIFACTS_DIR)/nodejs/package.json" # to avoid rebuilding when changes doesn't relate to dependencies