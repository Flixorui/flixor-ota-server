import formidable from 'formidable';
import fs from 'fs';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';

import { DatabaseFactory } from '../../apiUtils/database/DatabaseFactory';
import { StorageFactory } from '../../apiUtils/storage/StorageFactory';

import AdmZip from 'adm-zip';
import { ZipHelper } from '../../apiUtils/helpers/ZipHelper';
import { HashHelper } from '../../apiUtils/helpers/HashHelper';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function uploadHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    const runtimeVersionFields = fields.runtimeVersion ?? [];
    const commitHash = fields.commitHash?.[0];
    const commitMessage = fields.commitMessage?.[0] || 'No message provided';
    const releaseNotes = fields.releaseNotes?.[0] || '';
    const platforms = fields.platforms?.[0] || 'ios,android';

    if (!file || runtimeVersionFields.length === 0 || !commitHash) {
      res.status(400).json({ error: 'Missing file, runtime version, or commit hash' });
      return;
    }

    // Support:
    // - comma-separated runtime versions in a single field, e.g. "1.0.0,1.0.1"
    // - repeated runtimeVersion fields, e.g. runtimeVersion=1.0.0 & runtimeVersion=1.0.1
    // Deduped while preserving order.
    const runtimeVersions: string[] = [];
    for (const fieldValue of runtimeVersionFields) {
      const parts = String(fieldValue)
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
      for (const v of parts) {
        if (!runtimeVersions.includes(v)) runtimeVersions.push(v);
      }
    }

    if (runtimeVersions.length === 0) {
      res.status(400).json({ error: 'No valid runtime versions provided' });
      return;
    }

    const storage = StorageFactory.getStorage();
    const timestamp = moment().utc().format('YYYYMMDDHHmmss');

    // Read the zip file once
    const zipContent = fs.readFileSync(file.filepath);
    const zipFolder = new AdmZip(file.filepath);
    const metadataJsonFile = await ZipHelper.getFileFromZip(zipFolder, 'metadata.json');

    const updateHash = HashHelper.createHash(metadataJsonFile, 'sha256', 'hex');
    const updateId = HashHelper.convertSHA256HashToUUID(updateHash);

    const results: { runtimeVersion: string; path: string; success: boolean; error?: string }[] = [];

    // Deploy to all specified runtime versions
    for (const runtimeVersion of runtimeVersions) {
      try {
        const updatePath = `updates/${runtimeVersion}`;
        const path = await storage.uploadFile(`${updatePath}/${timestamp}.zip`, zipContent);

        const releasePayload: any = {
          path,
          runtimeVersion,
          timestamp: moment().utc().toString(),
          commitHash,
          commitMessage,
          updateId,
          platforms,
        };
        if (releaseNotes && releaseNotes.trim().length > 0) {
          releasePayload.releaseNotes = releaseNotes;
        }

        await DatabaseFactory.getDatabase().createRelease(releasePayload);

        results.push({ runtimeVersion, path, success: true });
        console.log(`Successfully deployed to runtime version ${runtimeVersion}: ${path}`);
      } catch (versionError: any) {
        console.error(`Failed to deploy to runtime version ${runtimeVersion}:`, versionError);
        results.push({
          runtimeVersion,
          path: '',
          success: false,
          error: versionError.message || 'Unknown error'
        });
      }
    }

    // Check if at least one deployment succeeded
    const successfulDeployments = results.filter(r => r.success);
    const failedDeployments = results.filter(r => !r.success);

    if (successfulDeployments.length === 0) {
      res.status(500).json({
        error: 'All deployments failed',
        results
      });
      return;
    }

    res.status(200).json({
      success: true,
      path: successfulDeployments[0].path,
      deployedVersions: successfulDeployments.map(r => r.runtimeVersion),
      failedVersions: failedDeployments.map(r => ({ version: r.runtimeVersion, error: r.error })),
      results
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
