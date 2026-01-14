import mime from 'mime';
import { NextApiRequest, NextApiResponse } from 'next';
import nullthrows from 'nullthrows';
import { Readable } from 'stream';

import { UpdateHelper } from '../../apiUtils/helpers/UpdateHelper';
import { ZipHelper } from '../../apiUtils/helpers/ZipHelper';

export default async function assetsEndpoint(req: NextApiRequest, res: NextApiResponse) {
  const { asset: assetPath, runtimeVersion, platform } = req.query;

  if (!assetPath || typeof assetPath !== 'string') {
    res.statusCode = 400;
    res.json({ error: 'No asset path provided.' });
    return;
  }

  if (platform !== 'ios' && platform !== 'android') {
    res.statusCode = 400;
    res.json({ error: 'No platform provided. Expected "ios" or "android".' });
    return;
  }

  if (!runtimeVersion || typeof runtimeVersion !== 'string') {
    res.statusCode = 400;
    res.json({ error: 'No runtimeVersion provided.' });
    return;
  }

  try {
    const updateBundlePath = await UpdateHelper.getLatestUpdateBundlePathForRuntimeVersionAsync(
      runtimeVersion as string
    );
    const zip = await ZipHelper.getZipFromStorage(updateBundlePath);

    const { metadataJson } = await UpdateHelper.getMetadataAsync({
      updateBundlePath,
      runtimeVersion: runtimeVersion as string,
    });

    const assetMetadata = metadataJson.fileMetadata[platform].assets.find(
      (asset: any) => asset.path === assetPath
    );
    const isLaunchAsset = metadataJson.fileMetadata[platform].bundle === assetPath;

    if (!assetMetadata && !isLaunchAsset) {
      res.statusCode = 404;
      res.json({ error: `Asset not found: ${assetPath}` });
      return;
    }

    const asset = await ZipHelper.getFileFromZip(zip, assetPath as string);

    // Set appropriate headers
    res.statusCode = 200;
    res.setHeader(
      'content-type',
      isLaunchAsset ? 'application/javascript' : nullthrows(mime.getType(assetMetadata.ext))
    );
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // For large files (>4MB), stream the response to avoid Next.js API route limits
    if (asset.length > 4 * 1024 * 1024) { // 4MB threshold
      console.log(`[assets] Streaming large file: ${assetPath} (${(asset.length / 1024 / 1024).toFixed(2)}MB)`);
      
      // Create a readable stream from the buffer
      const stream = new Readable({
        read() {
          this.push(asset);
          this.push(null); // End the stream
        }
      });
      
      // Pipe the stream to the response
      stream.pipe(res);
    } else {
      // For smaller files, use the regular response
      res.end(asset);
    }
  } catch (error) {
    console.error('[assets] Error:', error);
    res.statusCode = 500;
    res.json({ error: error.message || 'Internal server error' });
  }
}

// Configure API route to handle larger responses
export const config = {
  api: {
    responseLimit: false, // Disable response size limit
    bodyParser: {
      sizeLimit: '50mb', // Increase body parser limit
    },
  },
};
