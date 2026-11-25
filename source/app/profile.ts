// NodeForge's product identity and document wording for the shared shell.
// Licensed under the GNU General Public License v2 or later. See LICENSE.
import { profileBlocks, type ForgeBlock } from "forge-shell/app/blocks";
import type { ForgeAppProfile, ForgeEnvironment } from "forge-shell/app/profile";
import config from "../../forge.config.json";

/** NodeForge works on parts and scopes, so it is a workspace: `list`, `info` and `select` run over its item commands. */
export const ENVIRONMENT = config.environment as ForgeEnvironment;
/** The shared mechanisms NodeForge declares: documents (circuits) and updates (GitHub releases). */
export const BLOCKS = profileBlocks({ ...config, environment: ENVIRONMENT, blocks: config.blocks as ForgeBlock[] });
export const forgeApp = { ...config, environment: ENVIRONMENT, blocks: BLOCKS } satisfies ForgeAppProfile;
