'use strict';

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { DManager } from '../utils/dpk/manager.js';
import { DRegistryUtils } from '../utils/dpk/registry-utils.js';
import { Logger } from '../utils/logger.js';
import { stringify } from '../utils/misc.js';
import { ResponseUtils } from '../utils/response.js';

const registry = express();

registry.use(cors());
registry.use(express.json());
registry.use(express.urlencoded({ extended: true }));
registry.use(express.raw({ type: 'application/octet-stream', limit: '10gb' }));
registry.use((req: Request, _: Response, next: NextFunction) => {
  req.url = decodeURIComponent(req.url);
  Logger.log(`${req.method} ${req.url}`);
  next();
});

registry.get(['/', '/health'], (_: Request, res: Response) => {
  res.status(200).json({ ok: true, message: 'Registry is up and running!' });
});

// "@drpm/tool5~8w7ckznnw671az7nmkrd19ddctpj4spgt8sjqxkmnamdartxh1bo": "^6.1.0"
registry.get(['/:scope/:name~:id', '/:scope/:name~:method~:id'], async (req: Request, res: Response): Promise<any> => {
  try {
    const { scope, name, method, id } = req.params ?? {};
    const dependency = !method ? `${scope}/${name}~${id}` : `${scope}/${name}~${method}~${id}`;;
    Logger.log(`${dependency} => ${stringify(req.params)}`);

    const missing = DRegistryUtils.checkReqParams({scope, name, id}) ?? [];
    if(missing.length > 0) {
      const missingList = missing.join(', ');
      Logger.error(`DrgRoutes: Missing required params - ${missingList}`);
      return res.status(404).json({ error: `Missing required params: ${missingList}` });
    }

    const did = !method ? `did:dht:${id}` : `did:${method}:${id}`;
    Logger.debug(`Using DID ${did}`);

    const metadataResponse = await DManager.readDpk({ did, dpk: { name: dependency, path: 'package' } });
    if(ResponseUtils.fail(metadataResponse)) {
      Logger.error(`DrgRoutes: Failed to find or fetch version`, metadataResponse.error);
      return res.status(404).json({ error: metadataResponse.error });
    }
    console.log('metadataResponse', metadataResponse);
    const data = metadataResponse.data;
    console.log('data', data);
    const version = data['dist-tags'].latest;
    console.log('version', version);
    const tgz = data._attachments[`${dependency}-${version}.tgz`].data;
    console.log('tgz', tgz);

    // if(!version) {
    //   Logger.error(`DrgRoutes: Failed to find or fetch version`, metadataResponse.error);
    //   return res.status(404).json({ error: 'Failed to find or fetch version' });
    // }

    // const tarballResponse = await DManager.readDpk({ did, dpk: { name: dependency, version, path: 'package/release' } });
    // if(ResponseUtils.fail(tarballResponse)) {
    //   Logger.error(`DrgRoutes: Failed to find or fetch tarball`, tarballResponse.error);
    //   return res.status(404).json({ error: tarballResponse.error });
    // }
    // const tarballPath = tarballResponse?.data;
    // Logger.debug(`Sending tarball at path ${tarballPath}`);

    return res.status(200).sendFile(tgz, {
      headers : { 'Content-Type': 'application/octet-stream' }
    });

  } catch (error: any) {
    Logger.error(`Error fetching or saving metadata or tarball`, error);
    return res.status(404).json({ error: error.message });
  }
});


// PUT route to handle metadata publishing
registry.put('/:scope/:name~:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { scope, name, method, id } = req.params ?? {};
    if(method) {
      return res.status(404).json({ error: `Method ${method} not supported` });
    }
    const metadata = req.body;
    const version = metadata['dist-tags'].latest;
    const dependency =`${scope}/${name}~${id}`;
    Logger.log(`${dependency} => ${stringify(req.params)}`);
    const missing = DRegistryUtils.checkReqParams(req.params) ?? [];
    if(missing.length > 0) {
      const missingList = missing.join(', ');
      Logger.error(`DrgRoutes: Missing required params - ${missingList}`);
      return res.status(404).json({
        error : `Missing required params: ${missingList}`
      });
    }
    const packageResponse = await DManager.createPackage({ metadata });
    if(ResponseUtils.fail(packageResponse)) {
      Logger.error(`DrgRoute: Failed to publish package metadata`, packageResponse.error);
      return res.status(packageResponse.code).json({ error: packageResponse.error });
    }
    const release = metadata._attachments[`${dependency}-${version}.tgz`]?.data;
    const integrity = metadata.versions[version].dist.integrity;
    const response = await DManager.createPackageRelease({
      parentId : packageResponse.data,
      name     : metadata.name,
      version,
      integrity,
      release
    });
    if(ResponseUtils.fail(response)) {
      Logger.error(`DrgRoutes: Failed to upload tarball`, response.error);
      return res.status(404).json({ error: response.error });
    }
    Logger.log('response', response);
    Logger.log('response.data', response.data);
    Logger.log(`Tarball uploaded successfully!`);

    return res.status(200).json({ message: 'Tarball uploaded successfully' });
  } catch (error: any) {
    Logger.error('Error during publish:', error);
    return res.status(404).json({ error: 'Failed to publish package metadata.' });
  }
});

export default registry;
