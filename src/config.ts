import { join } from 'path';
import { DrlUtils } from './utils/dwn/drl-utils.js';
import dwn from './utils/dwn/protocol.js';
import { homedir } from 'os';

export const DRPM_REGISTRY_PORT = process.env.PORT || '2092';
export const DRPM_REGISTRY_URL = `http://localhost:${DRPM_REGISTRY_PORT}`;
export const DRPM_DWN_URL = 'https://dwn.drpm.tools';
export const DRPM_REGISTRY_DIR = join(process.env.HOME || homedir(), '.drpm', 'registry');
export const DRPM_PROTOCOL_B64URL = DrlUtils.base64urlEncode(dwn.protocol);
export const DRL_PROTOCOL_PARAM = `read/protocols/${DRPM_PROTOCOL_B64URL}`;
export const DRPM_VERSION_PREFIXES = ['~', '^', '<', '>', '<=', '>=', '=', '-', '@'];