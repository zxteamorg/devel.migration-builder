#!/usr/bin/env node

"use strict";

const { DUMMY_CANCELLATION_TOKEN } = require("@zxteam/cancellation");
const { chainConfiguration, envConfiguration, fileConfiguration } = require("@zxteam/configuration");
const { InvalidOperationError } = require("@zxteam/errors");
const { logger: rootLogger } = require("@zxteam/logger");
const { MigrationSources } = require("@zxteam/sql");

const Mustache = require("mustache");

const fs = require("fs");
const path = require("path");
const appLogger = rootLogger.getLogger("build");

async function main() {
	appLogger.info(`Database Migration Builder`);

	const appOpts = parseArgs();

	const startDate = new Date();

	const mainLogger = rootLogger.getLogger("main");

	const configFile = path.normalize(path.join(process.cwd(), "database.config"));
	const configuration = createConfiguration(fs.existsSync(configFile) ? configFile : null, appOpts.envConfigurationFile, mainLogger.getLogger("config-loader"));
	const configurationProxy = configuration !== null ? createConfigurationProxy(configuration) : Object.freeze({});

	mainLogger.info("Loading migration scripts...");
	const loadOpts = {};
	if (appOpts.versionFrom !== null) { loadOpts.versionFrom = appOpts.versionFrom; }
	if (appOpts.versionTo !== null) { loadOpts.versionTo = appOpts.versionTo; }
	const migrationSources = await MigrationSources.loadFromFilesystem(
		DUMMY_CANCELLATION_TOKEN,
		path.normalize(path.join(process.cwd(), "updates")),
		loadOpts
	);

	const destinationDirectory = path.normalize(path.join(process.cwd(), ".dist"));
	if (fs.existsSync(destinationDirectory)) {
		mainLogger.info(`Cleaning target directory ${destinationDirectory}...`);
		deleteDirectoryRecursiveSync(destinationDirectory, false);
	} else {
		mainLogger.info(`Creating target directory ${destinationDirectory}...`);
		fs.mkdirSync(destinationDirectory, { recursive: true, mode: 0o777 });
	}

	mainLogger.info("Building Mustache templates...");
	//const databaseName = configurationProxy.name;
	const transformedSources = migrationSources.map(
		(content, opts) => {
			mainLogger.info(`[${opts.versionName}] ${opts.itemName}`);
			return Mustache.render(content, {
				direction: opts.direction, // install/rollback
				version: opts.versionName,
				file: opts.itemName,
				database: configurationProxy,
				isDevelopmentBuild: appOpts.isDevelopmentBuild
			});
		}
	);

	mainLogger.info(`Saving compiled scripts  to ${destinationDirectory}...`);
	await transformedSources.saveToFilesystem(
		DUMMY_CANCELLATION_TOKEN,
		destinationDirectory
	);

	const endDate = new Date();
	const secondsDiff = (endDate.getTime() - startDate.getTime()) / 1000;
	mainLogger.info(`Done in ${secondsDiff} seconds.`);
}

main().then(
	function () { process.exit(0); }
).catch(
	function (reason) {
		appLogger.fatal("Crash application", reason);
		process.exit(1);
	}
);

function deleteDirectoryRecursiveSync(directory, isRemoveItself = true) {
	if (fs.existsSync(directory)) {
		fs.readdirSync(directory).forEach((file, index) => {
			const curPath = path.join(directory, file);
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteDirectoryRecursiveSync(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		if (isRemoveItself === true) {
			fs.rmdirSync(directory);
		}
	}
}

function createConfiguration(configFile, envConfigurationFile, logger) {
	const configs = [];

	logger.info(`Loading configuration environment variables...`);
	configs.push(envConfiguration());

	if (envConfigurationFile !== null) {
		logger.info(`Loading configuration from file ${envConfigurationFile}...`);
		configs.push(fileConfiguration(envConfigurationFile));
	}

	if (configFile !== null) {
		logger.info(`Loading configuration from file ${configFile}...`);
		configs.push(fileConfiguration(configFile));
	}

	const finalConfig = chainConfiguration(...configs);

	if (!finalConfig.hasNamespace("database")) {
		return null;
	}

	return finalConfig.getConfiguration("database");
}

function createConfigurationProxy(finalConfig) {
	function keyWalker(keys, sourceConfig, parent) {
		const target = {};
		const dottedKeys = new Map();
		for (const key of keys) {
			const dotIndex = key.indexOf(".");
			if (dotIndex === -1) {
				target[key] = sourceConfig.get(key);
			} else {
				const parentKey = key.substring(0, dotIndex);
				const subKey = key.substring(dotIndex + 1);
				if (dottedKeys.has(parentKey)) {
					dottedKeys.get(parentKey).push(subKey);
				} else {
					dottedKeys.set(parentKey, [subKey]);
				}
			}
		}
		for (const [parentKey, subKeys] of dottedKeys.entries()) {
			const inner = keyWalker(subKeys, sourceConfig.getConfiguration(parentKey), parentKey);
			target[parentKey] = inner;
			target[`${parentKey}s`] = Object.keys(inner).filter(key => !key.endsWith("s")).map(key => inner[key]);

		}
		return target;
	}

	const objectConfig = keyWalker(finalConfig.keys, finalConfig);

	const proxyConfig = new Proxy(objectConfig, {
		get(_, propery) {
			if (typeof propery === "string") {
				if (propery in objectConfig) {
					return objectConfig[propery];
				}
				throw new InvalidOperationError(`Non-existing property request '${propery}'.`);
			}
		}
	});

	return proxyConfig;
}

function parseArgs() {
	let envConfigurationFile = null;
	let isDevelopmentBuild = false;
	let versionFrom = null;
	let versionTo = null;

	if (process.env["VERSION_FROM"]) {
		versionFrom = process.env["VERSION_FROM"];
	}

	if (process.env["VERSION_TO"]) {
		versionTo = process.env["VERSION_TO"];
	}

	if (process.env["ENV"]) {
		envConfigurationFile = process.env["ENV"] ? path.normalize(path.join(process.cwd(), `database-${process.env["ENV"]}.config`)) : null;
	}

	if (process.env["DEVEL"] === "true") {
		isDevelopmentBuild = true;
	}

	return Object.freeze({
		envConfigurationFile,
		isDevelopmentBuild,
		versionFrom,
		versionTo
	});
}
