import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseFactory } from '../../apiUtils/database/DatabaseFactory';

export default async function healthHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Test database connection
    const db = DatabaseFactory.getDatabase();
    const releases = await db.listReleases();

    // Test environment variables
    const envCheck = {
      DB_TYPE: process.env.DB_TYPE,
      POSTGRES_HOST: process.env.POSTGRES_HOST,
      POSTGRES_DB: process.env.POSTGRES_DB,
      POSTGRES_USER: process.env.POSTGRES_USER,
      POSTGRES_PORT: process.env.POSTGRES_PORT,
      NODE_ENV: process.env.NODE_ENV,
    };

    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      releasesCount: releases.length,
      environment: envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      environment: {
        DB_TYPE: process.env.DB_TYPE,
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        POSTGRES_DB: process.env.POSTGRES_DB,
        POSTGRES_USER: process.env.POSTGRES_USER,
        POSTGRES_PORT: process.env.POSTGRES_PORT,
        NODE_ENV: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
